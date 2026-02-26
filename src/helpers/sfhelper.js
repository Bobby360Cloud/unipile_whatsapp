import mime from "mime-types";
import { getMessageTime, getNumAvailability, isGroupSupported } from "./helper.js"
import consts, { sf_LoginURL , querySF, authAppURL } from "./constants.js";
import userModel from "../models/user.model.js";
import checkNumbersModel from "../models/checkNumbers.model.js";
import makeRequest, { getRequest, postRequest ,patchRequest, formDataRequest } from "./request.js";
// import { sendMsgToWhatsapp } from "../../controllers/messageController.js";
import { bulkUpdateNumbersWithFalse, bulkUpdateNumbersWithTrue, numberUpdateWithFalse, numberUpdateWithTrue } from "./dbhelper.js";
import { Readable } from 'stream';
import FormData from 'form-data';

import { encryptString, getOrgString } from "./validator.js";

const {routes_Url} = consts;


export async function sendSFPendingRec(sessionId, needFromSf = false) {
  try {
    if (sessionId) {
      console.log("inside sendSF Pending Rec====================")
      const getAccessAndInstance = await getConnectToSf(sessionId, needFromSf);
      const orgId = sessionId?.slice(0, 18);
      const userId = sessionId?.slice(18);
      let isGroup = await isGroupSupported(orgId, userId);
      const usersession = await userModel.findOne({ sessionId });
      let scannedNumber;
      if (usersession?.phone_id) {
        const cacheData = await cacheGet(usersession?.phone_id);
        scannedNumber = cacheData?.activeNumber;
      }

      let instanceUrl, accessToken;

      if (
        getAccessAndInstance &&
        getAccessAndInstance?.responseFromSFForAccessToken?.data &&
        getAccessAndInstance?.responseFromSFForAccessToken?.data.instance_url &&
        getAccessAndInstance?.responseFromSFForAccessToken?.data.access_token
      ) {
        instanceUrl =
          getAccessAndInstance.responseFromSFForAccessToken.data.instance_url;
        accessToken =
          getAccessAndInstance.responseFromSFForAccessToken.data.access_token;

        const SF_Headers = {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/JSON",
        };

        const checkURlTOSENDpending =
          routes_Url.checkURlTOSENDpending(instanceUrl);

        const responseFromcheckURlTOSENDpending = await makeRequest({
          headers: SF_Headers,
          method: "get",
          url: checkURlTOSENDpending,
        });
        if (
          responseFromcheckURlTOSENDpending &&
          responseFromcheckURlTOSENDpending?.response &&
          responseFromcheckURlTOSENDpending?.response?.status === 401 &&
          Array.isArray(responseFromcheckURlTOSENDpending.response.data) &&
          responseFromcheckURlTOSENDpending.response.data[0]?.errorCode ===
          "INVALID_SESSION_ID"
        ) {
          await sendSFPendingRec(sessionId, true);
        }

        if (
          responseFromcheckURlTOSENDpending &&
          responseFromcheckURlTOSENDpending.data &&
          responseFromcheckURlTOSENDpending.data.records &&
          responseFromcheckURlTOSENDpending.data.records.length > 0 &&
          responseFromcheckURlTOSENDpending.data.records[0] &&
          responseFromcheckURlTOSENDpending.data.records[0]
            .tdc_tsw__Value__c === "Enable"
        ) {
          let getSfRecURl = routes_Url.getSFPendingRecUrl(
            instanceUrl,
            getAccessAndInstance?.userId
          );
          console.log("getSfRecURl---", getSfRecURl);

          let responseFromgetSfRecURl = await makeRequest({
            headers: SF_Headers,
            method: "get",
            url: getSfRecURl,
          });
          console.log(
            "responseFromgetSfRecURl-----",
            responseFromgetSfRecURl?.data
          );
          if (!responseFromgetSfRecURl?.data) {
            getSfRecURl = `${instanceUrl}/services/data/v48.0/query/?q=SELECT+Id+,+tdc_tsw__Message_Text_New__c+,+tdc_tsw__ToNumber__c+,+tdc_tsw__Sender_Number__c+,+Media_Payload__c+FROM+tdc_tsw__Message__c+where+tdc_tsw__Status__c+=+'Pending'+AND+Owner.Id=+'${getAccessAndInstance?.userId}'+Order+by+CreatedDate+ASC`;
            responseFromgetSfRecURl = await getRequest(SF_Headers, getSfRecURl);
          }
          if (
            responseFromgetSfRecURl &&
            responseFromgetSfRecURl.data &&
            responseFromgetSfRecURl.data.records &&
            responseFromgetSfRecURl.data.records.length > 0
          ) {
            console.log("inside responseFromgetSfRecURl");

            const pendingRec = responseFromgetSfRecURl.data.records;

            pendingRec.forEach(async (record) => {
              let context_message_id;
              let updateObj;
              const id = record?.Id;
              let number = record?.tdc_tsw__ToNumber__c;
              let SFgroupChat = record?.tdc_tsw__Group_Chat__c;
              let fileUrls = record?.tdc_tsw__Media_Payload__c ? record?.tdc_tsw__Media_Payload__c : record?.Media_Payload__c;
              const message = record?.tdc_tsw__Message_Text_New__c;
              try {
                if (fileUrls) {
                  fileUrls = JSON.parse(fileUrls);
                  fileUrls = Object.values(fileUrls);
                  fileUrls = fileUrls[0]
                  if(fileUrls){
                    fileUrls = fileUrls?.downloadUrl;
                  }
                }
              } catch (err) {
                console.log("Error in parsing fileUrls", err);
              }

              number = number.replace(/\D/g, '');
              
              if (number && !SFgroupChat) {
                if (record?.tdc_tsw__ContextId__c) {
                    context_message_id = record?.tdc_tsw__ContextId__c;
                }
                if (fileUrls) {
                  const urls = fileUrls.match(/https?:\/\/[^\s"]+/g);
                  console.log(urls);
                  if (urls && urls.length > 0) {
                    let count = 1;
                    urls.forEach(async (fileurl) => {
                      let sentMsgU;
                      if (count === urls.length) {
                        sentMsgU = await sendMsgToWhatsapp(sessionId, number, message, fileurl);
                      } else {
                        sentMsgU = await sendMsgToWhatsapp(sessionId, number, "", fileurl, context_message_id);
                        await new Promise((resolve) =>
                          setTimeout(resolve, 30000)
                        );
                      }
                      if (sentMsgU && sentMsgU?.messageId) {
                        updateObj = {
                          tdc_tsw__MessageId__c: sentMsgU?.messageId,
                          tdc_tsw__Status__c: "Sent",
                          tdc_tsw__Error_Message__c: "",
                          tdc_tsw__Error_Code__c: "",
                        };
                      } else {
                        updateObj = {
                          tdc_tsw__Status__c: "Failed",
                          tdc_tsw__Error_Message__c: "",
                          tdc_tsw__Error_Code__c: "",
                        };
                      }
                      const sfUpdateUrl = `${instanceUrl}/services/data/v54.0/sobjects/tdc_tsw__Message__c/${id}`;

                      await patchRequest(SF_Headers, sfUpdateUrl, updateObj);
                      count = count + 1;
                    });
                  }
                } else {
                  const sentMsg = await sendMsgToWhatsapp(sessionId,number,message,"",context_message_id);
                  if (sentMsg && sentMsg?.messageId) {
                    updateObj = {
                      tdc_tsw__MessageId__c: sentMsg?.messageId,
                      tdc_tsw__Status__c: "Sent",
                      tdc_tsw__Error_Message__c: "",
                      tdc_tsw__Error_Code__c: "",
                    };
                  } else {
                    updateObj = {
                      tdc_tsw__Status__c: "Failed",
                      tdc_tsw__Error_Message__c: "",
                      tdc_tsw__Error_Code__c: "",
                    };
                  }
                  const sfUpdateUrl = `${instanceUrl}/services/data/v54.0/sobjects/tdc_tsw__Message__c/${id}`;
                  await patchRequest(SF_Headers, sfUpdateUrl, updateObj);
                }
              }
              else if (SFgroupChat && isGroup && scannedNumber) {
                let groupId;
                let SFgroupParticipants = [];
                let shouldSend = false;
                const getGroupIdUrl = `${instanceUrl}/services/data/v48.0/query/?q=SELECT+Id,+Name,+tdc_tsw__ChatID__c,+(SELECT+Id,+tdc_tsw__Phone_Number__c,+tdc_tsw__Group_Chat__c+FROM+tdc_tsw__Group_Chat_Participants__r+WHERE+tdc_tsw__Sender__c+=+false)+FROM+tdc_tsw__Group_Chat__c+where+Id+=+'${SFgroupChat}'`;
                console.log("getGroupIdUrl---", getGroupIdUrl);
                const responseFromgetSfGroupId = await getRequest(
                  SF_Headers,
                  getGroupIdUrl
                );
                if (responseFromgetSfGroupId?.data?.records?.length > 0) {
                  groupId =
                    responseFromgetSfGroupId?.data?.records[0]
                      ?.tdc_tsw__ChatID__c;
                  if (responseFromgetSfGroupId?.data?.records[0]?.tdc_tsw__Group_Chat_Participants__r?.records?.length > 0) {
                    for (const participant of responseFromgetSfGroupId?.data?.records[0]?.tdc_tsw__Group_Chat_Participants__r?.records) {
                      SFgroupParticipants.push(participant.tdc_tsw__Phone_Number__c);
                    }
                  }
                  if (SFgroupParticipants && SFgroupParticipants.length > 0) {
                    let groupParticipants = [];
                    for (let number of SFgroupParticipants) {
                      number = number.replace(/\D/g, '');
                      groupParticipants.push(number);
                    }
                    shouldSend = groupParticipants.includes(scannedNumber);
                  }

                }
                if (groupId && shouldSend === true) {
                  if (record?.tdc_tsw__ContextId__c) {
                      context_message_id = record?.tdc_tsw__ContextId__c;
                  }
                  console.log("groupId---", groupId);
                  if (fileUrls) {
                    const urlRegex = /https?:\/\/[^\s"']+/g;
                    const urls = file.match(urlRegex);
                    console.log(urls);
                    if (urls && urls.length > 0) {
                      let count = 1;
                      urls.forEach(async (file) => {
                        let sendGroupMsg;
                        if (count === urls.length) {
                          sendGroupMsg = await sendMsgToWhatsapp(
                            sessionId,
                            groupId,
                            message,
                            file,
                            context_message_id
                          );
                        } else {
                          sendGroupMsg = await sendMsgToWhatsapp(
                            sessionId,
                            groupId,
                            "",
                            file,
                            context_message_id
                          );
                          await new Promise((resolve) =>
                            setTimeout(resolve, 30000)
                          );
                        }
                        if (sendGroupMsg?.messageId) {
                          updateObj = {
                            tdc_tsw__MessageId__c: sendGroupMsg?.messageId,
                            tdc_tsw__Sender_Number__c: scannedNumber,
                            tdc_tsw__Status__c: "Sent",
                            tdc_tsw__Error_Message__c: "",
                            tdc_tsw__Error_Code__c: "",
                          };
                        } else {
                          updateObj = {
                            tdc_tsw__Status__c: "Failed",
                            tdc_tsw__Error_Message__c: "",
                            tdc_tsw__Error_Code__c: "",
                          };
                        }
                        console.log("updateObj--- if file", updateObj);
                        const sfUpdateUrl = `${instanceUrl}/services/data/v54.0/sobjects/tdc_tsw__Message__c/${id}`;

                        await patchRequest(SF_Headers, sfUpdateUrl, updateObj);
                        count = count + 1;
                      });
                    }
                  } else {
                    const sendGroupMsg = await makeWASocketInstanceSendGroup(
                      sessionId,
                      groupId,
                      message,
                      "",
                      context_message_id
                    );
                    if (sendGroupMsg?.messageId) {
                      updateObj = {
                        tdc_tsw__MessageId__c: sendGroupMsg?.messageId,
                        tdc_tsw__Sender_Number__c: scannedNumber,
                        tdc_tsw__Status__c: "Sent",
                        tdc_tsw__Error_Message__c: "",
                        tdc_tsw__Error_Code__c: "",
                      };
                    } else {
                      updateObj = {
                        tdc_tsw__Status__c: "Failed",
                        tdc_tsw__Error_Message__c: "",
                        tdc_tsw__Error_Code__c: "",
                      };
                    }
                    console.log("updateObj--- if message only", updateObj);
                    const sfUpdateUrl = `${instanceUrl}/services/data/v54.0/sobjects/tdc_tsw__Message__c/${id}`;
                    await patchRequest(SF_Headers, sfUpdateUrl, updateObj);
                  }
                } else {
                  console.log("groupId not found during sendSFPendingRec");
                }
              }
            });
          } else {
          }
        } else {
        }
      } else {
      }
    } else {
    }
  } catch (error) {
    console.log("catch block in sendSFPendingRec ------", error);
  }
}

export async function CheckAvailableNumbers(
  sessionId,
  messageTime,
  fromNumber,
  checkNumber,
  type,
  groupId,
  groupName,
  needFromSf = false
) {
  try {
    if (sessionId && checkNumber) {
      const getAccessAndInstance = await getConnectToSf(
        sessionId,
        needFromSf
      );
      const userSessionData = await userModel.findOne({sessionId });
      const namespace = userSessionData?.custom_namespace || 'tdc_tsw';
      let instanceUrl, accessToken;
      if (getAccessAndInstance?.responseFromSFForAccessToken && getAccessAndInstance?.responseFromSFForAccessToken?.data && getAccessAndInstance?.responseFromSFForAccessToken.data.instance_url && getAccessAndInstance?.responseFromSFForAccessToken.data.access_token) {
        instanceUrl = getAccessAndInstance.responseFromSFForAccessToken.data.instance_url;
        accessToken = getAccessAndInstance.responseFromSFForAccessToken.data.access_token;

        const CheckAvailableNumbersObj = {
          "type": "CheckAvailableNumbers",
          "WebWhatsappSync": messageTime,
          "userId": getAccessAndInstance?.userId,
          "FromNumber": fromNumber,
          "CheckAvailableNumbers": type === 'Outgoing' ? [checkNumber] : type === 'pending' ? checkNumber : [fromNumber]
        }

        if (groupId) {
          CheckAvailableNumbersObj["groupId"] = groupId;
          if(groupName) CheckAvailableNumbersObj["groupName"] = groupName;
          CheckAvailableNumbersObj.CheckAvailableNumbers = checkNumber
        }

        console.log("CheckAvailableNumbersObj", CheckAvailableNumbersObj);

        const SF_Headers = {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/JSON',
        }

        const sf_URlForNumberCheck = `${instanceUrl}/services/apexrest/${namespace}/WebWhatsAppSync`;

        const responseFromSFForNumCheck = await callSFApi(sessionId, sf_URlForNumberCheck, SF_Headers, CheckAvailableNumbersObj, 'post');
        return { responseFromSFForNumCheck: responseFromSFForNumCheck, instanceUrl: instanceUrl, accessToken: accessToken, userId: getAccessAndInstance?.userId };
      } else {
        const errorobj = {
          error_type: "Salesforce",
          error_code: "400",
          error_message: "Cannot get the Access Token And Instance Url",
        }
        // new errorRecord(errorobj).save();
      }
    } else {
      console.log("sessionId messageTime fromNumber checkNumber is not sent");
      const errorobj = {
        error_type: "General Error",
        error_code: "400",
        error_message: "sessionId messageTime fromNumber checkNumber is not sent",
      }
      new errorRecord(errorobj).save();
      return {};
    }
  } catch (error) {
    console.log("Error in the getting available number", error);
    const errorobj = {
      error_type: "Salesforce",
      error_code: "400",
      error_message: "Error in getting available number"
    }
    new errorRecord(errorobj).save();
    return {};
  }
}
async function callSFApi(sessionId, url, headers, data, method) {
  try {
    let response
    if (method === 'get')
      response = await getRequest(headers, url);
    else if (method === 'post') {
      response = await postRequest(headers, url, data);
    } else if (method === 'patch') {
      response = await patchRequest(headers, url, data);
    } else if (method === 'form-data') {
      response = await formDataRequest(headers, url, data);
    }
    if (response?.response?.status === 401) {
      console.log("retrying to get access token and instance url for the sessionId", sessionId);
      let responseFromGetConnentToSf = await getConnectToSf(sessionId, true);
      if (responseFromGetConnentToSf?.responseFromSFForAccessToken?.data?.instance_url && responseFromGetConnentToSf?.responseFromSFForAccessToken?.data?.access_token) {
        headers['Authorization'] = `Bearer ${responseFromGetConnentToSf?.responseFromSFForAccessToken?.data?.access_token}`;
        if (method === 'get')
          response = await getRequest(headers, url);
        else if (method === 'post') {
          response = await postRequest(headers, url, data);
        } else if (method === 'patch') {
          response = await patchRequest(headers, url, data);
        } else if (method === 'form-data') {
          response = await formDataRequest(headers, url, data);
        }
      } return response
    }
    // console.log("response after callSFApi", response);
    else return response;
  } catch (error) {
    console.error("Error in callSFApi:", error);
    throw error;
  }
}
export async function getConnectToSf(sessionId, needFromSf = false) {
  try {
    let recordForUserSession = await userModel.findOne({ sessionId });
    console.log("recordForUserSession",recordForUserSession);
    if (
      !needFromSf &&
      recordForUserSession &&
      recordForUserSession?.sf_accessToken &&
      recordForUserSession?.sf_instanceUrl
    ) {
      return {
        responseFromSFForAccessToken: {
          data: {
            instance_url: recordForUserSession.sf_instanceUrl,
            access_token: recordForUserSession.sf_accessToken,
          },
        },
        userId: recordForUserSession?.userId,
      };
    }


      let orgId = recordForUserSession?.orgId;

      if (orgId) {
        const nodeAPPUrl = process.env.NODE_AUTHAPP_URL;

      const SF_url = authAppURL(nodeAPPUrl, orgId,needFromSf);
      const orgString = getOrgString(orgId);
      const token = encryptString(orgString);


      const headers = {
        "content-type": "application/json",
        "Authorization":`Bearer ${token}`
      };

      console.log("SF_url in the getConnectToSf", SF_url);

      const responseFromSFForAccessToken = await getRequest(headers ,SF_url)

      console.log(
        "responseFromSFForAccessToken/.......................",
        responseFromSFForAccessToken?.data
      );

      if (responseFromSFForAccessToken?.data?.data?.instance_url && responseFromSFForAccessToken?.data?.data?.access_token) {
        await userModel.updateOne({
          sessionId: sessionId
        }, { sf_instanceUrl: responseFromSFForAccessToken?.data?.data?.instance_url , sf_accessToken: responseFromSFForAccessToken?.data?.data?.access_token , sf_refreshToken: responseFromSFForAccessToken?.data?.refreshToken }).then(data => {
        }).catch(err => {
          console.log("err in update of usersessionids in the getConnectToSf", err);
        });
      } else {
      }
      let respobj = {
        responseFromSFForAccessToken : responseFromSFForAccessToken?.data,
        userId: recordForUserSession?.userId,
      }
      console.log("respObj================", respobj);
      return {
        responseFromSFForAccessToken : responseFromSFForAccessToken?.data,
        userId: recordForUserSession?.userId,
      };
    } else {
    }
  } catch (error) {
    console.log("Error in the getConnectToSf", error);
    const errorobj = {
      error_type: "Salesforce",
      error_code: "400",
      error_message: "Error in getting Access And Instance",
    };
    new errorRecord(errorobj).save();
  }
}

export const sendMobIncomingOutgoingMsgToSF = async (message) => {
  try {
    if(!message || !message.sessionId || !message.messageId){
      return;
    }

    let num = message?.type === 'Incoming' ? message.fromNumber : message.toNumber;
    const isNumExist = await getNumAvailability(message.sessionId, num);
    let availableNumbers;
    if (isNumExist === "NOT_EXIST" && message.fromNumber && message.toNumber) {
      availableNumbers = await CheckAvailableNumbers(
        message.sessionId,
        message.messageTimestamp,
        message.fromNumber,
        message.toNumber,
        message.type
      );
      if (availableNumbers?.responseFromSFForNumCheck?.data?.AvailableNo?.length) {
        await numberUpdateWithTrue(message.sessionId, num, message.chatId)
      }else if(availableNumbers?.responseFromSFForNumCheck?.data?.AvailableNo?.length ==0)
        await numberUpdateWithFalse(message.sessionId, num, message.chatId );
    } else if (isNumExist) {
      console.log("Number is already available in our db", num);
      const responseFromGetConnentToSf = await getConnectToSf(message.sessionId);
      availableNumbers = {
        responseFromSFForNumCheck: { data: { AvailableNo: [num] } },
        instanceUrl: responseFromGetConnentToSf?.responseFromSFForAccessToken?.data?.instance_url,
        accessToken: responseFromGetConnentToSf?.responseFromSFForAccessToken?.data?.access_token,
        userId: responseFromGetConnentToSf?.userId
      };
    }  

    console.log("availableNumbers -------------", availableNumbers?.responseFromSFForNumCheck?.data?.AvailableNo);

    if (
      availableNumbers?.responseFromSFForNumCheck?.data?.AvailableNo?.length > 0 &&
      availableNumbers?.instanceUrl &&
      availableNumbers?.accessToken
    ) {
      const instanceUrl = availableNumbers?.instanceUrl;
      const accessToken = availableNumbers?.accessToken;
      const SF_Headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/JSON',
      };

      if (
        (message?.type === 'Incoming' && availableNumbers.responseFromSFForNumCheck.data.AvailableNo[0] === message.fromNumber) ||
        (message?.type === 'Outgoing' && availableNumbers.responseFromSFForNumCheck.data.AvailableNo[0] === message.toNumber)
      ) {

        let ContentDocumentId, name, nameID;
        // 
        if (message?.mimetype && message?.image) {
          const contentVersion = await getcontentVersionId(message, accessToken, instanceUrl);
          console.log("contentVersion---", contentVersion);
          ContentDocumentId = contentVersion?.ContentDocumentId;
          name = contentVersion?.name;
          nameID = contentVersion?.nameId;
        }
        let timestamp = getMessageTime(message?.messageTimestamp);
        let messageObj = {
          Name: message?.type === 'Incoming' ? 'Incoming' : 'Outgoing',
          OwnerId: availableNumbers?.userId || message?.sessionId?.slice(18),
          tdc_tsw__MessageId__c: message.messageId,
          tdc_tsw__Channel__c: 'WhatsApp: Personal',
          tdc_tsw__Message_Text_New__c: message?.message,
          tdc_tsw__Source__c: 'Mobile - WhatsApp Personal',
          tdc_tsw__ToNumber__c: message?.toNumber,
          tdc_tsw__Sender_Number__c: message?.fromNumber,
          tdc_tsw__Message_Time__c: timestamp,
          attributes: { "type": "tdc_tsw__Message__c", "referenceId": message?.messageId }
        };
        if(message.contextMessageId)
          messageObj["tdc_tsw__ContextId__c"] = message.contextMessageId;

        if (ContentDocumentId) {
          messageObj["tdc_tsw__File_Ids__c"] = `${ContentDocumentId}:${nameID} 1`;
        }
        console.log("messageObj....................", messageObj);
        let sf_URlForMessage = `${instanceUrl}/services/data/v58.0/sobjects/tdc_tsw__Message__c`;
        //await postRequest(SF_Headers, sf_URlForMessage, messageObj);
        await callSFApi(message.sessionId, sf_URlForMessage, SF_Headers, messageObj, 'post');

        }
      }
    }catch (error) {
    console.log(`Error in sending ${message?.type} messages to SF`, error);
    new errorRecord({
      error_type: 'General Error',
      error_code: '400',
      error_message: `Error in sending ${message?.type} messages to SF in session ${message?.sessionId}`,
    }).save();
  }
}

export const sendGroupMessageToSF = async(message) =>{
    try {
      if(!message || !message.sessionId || !message.messageId){
        return;
      }
      const responseFromGetConnentToSf = await getConnectToSf(message.sessionId);

      const availableNumbers = {
        instanceUrl: responseFromGetConnentToSf?.responseFromSFForAccessToken?.data?.instance_url,
        accessToken: responseFromGetConnentToSf?.responseFromSFForAccessToken?.data?.access_token,
      };
      if (message?.sfGroupId &&
        availableNumbers?.instanceUrl &&
        availableNumbers?.accessToken
      ) {
        const instanceUrl = availableNumbers?.instanceUrl;
        const accessToken = availableNumbers?.accessToken;
        const SF_Headers = {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/JSON",
        };  
        let ContentDocumentId, name, nameID;
        if (message?.mimetype && message?.image) {
          const contentVersion = await getcontentVersionId(message, accessToken, instanceUrl);
          console.log("contentVersion---", contentVersion);
          ContentDocumentId = contentVersion?.ContentDocumentId;
          name = contentVersion?.name;
          nameID = contentVersion?.nameId;
        }

        let timestamp = getMessageTime(message?.messageTimestamp);
        let messageObj = {
          Name: message?.type === "Incoming" ? "Incoming" : "Outgoing",
          OwnerId: availableNumbers?.userId || message?.sessionId?.slice(18),
          tdc_tsw__MessageId__c: message?.messageId,
          tdc_tsw__Channel__c: "WhatsApp: Personal",
          tdc_tsw__Group_Chat__c: message?.sfGroupId,
          tdc_tsw__Status__c: message?.deliveryStatus,
          tdc_tsw__Message_Text_New__c: message?.message,
          tdc_tsw__Source__c: "Mobile - WhatsApp Personal",
          tdc_tsw__Sender_Number__c: message?.fromNumber,
          tdc_tsw__Message_Time__c: timestamp,
          tdc_tsw__ContextId__c: message?.contextMessageId,
          tdc_tsw__Location__Latitude__s: message?.latitude,
          tdc_tsw__Location__Longitude__s: message?.longitude,
          attributes: { "type": "tdc_tsw__Message__c", "referenceId": message?.messageId }
        };
        if (ContentDocumentId) {
          messageObj["tdc_tsw__File_Ids__c"] = `${ContentDocumentId}:${nameID} 1`;
        }
        console.log("syncing group messageObj to sf .................... message:", messageObj);
        let sf_URlForMessage = `${instanceUrl}/services/data/v58.0/sobjects/tdc_tsw__Message__c`;
        //await postRequest(SF_Headers, sf_URlForMessage, messageObj);
        await callSFApi(message.sessionId, sf_URlForMessage, SF_Headers, messageObj, 'post');
        
      }
    } catch (error) {
      console.log(`Error in sending ${message?.type} froup messages to SF`, error);
      new errorRecord({
        error_type: "General Error",
        error_code: "400",
        error_message: `Error in sending ${message?.type} messages to SF`,
      }).save();
    }
}

export const sendEditedIncomingToSF = async(message) =>{
  try {
    if(!message || !message.sessionId || !message.messageId){
      return;
    }
    let availableNumbers;
    if(!message?.sfGroupId){
      console.log("one to one edit message");
      let num = message?.type === 'Incoming' ? message.fromNumber : message.toNumber;
    const isNumExist = await getNumAvailability(message.sessionId.slice(0, 18), num);

    
    if (isNumExist === "NOT_EXIST" && message.fromNumber && message.toNumber) {
      availableNumbers = await CheckAvailableNumbers(
        message.sessionId,
        message.messageTimestamp,
        message.fromNumber,
        message.toNumber,
        message.type
      );
      if (availableNumbers?.responseFromSFForNumCheck?.data?.AvailableNo?.length) {
        await numberUpdateWithTrue(message.sessionId, availableNumbers?.responseFromSFForNumCheck?.data?.AvailableNo);
      }else if(availableNumbers?.responseFromSFForNumCheck?.data?.AvailableNo?.length ==0)
        await numberUpdateWithFalse(message.sessionId,[num]);
    } else if (isNumExist) {
      console.log("Number is already available in our db", num);
      const responseFromGetConnentToSf = await getConnectToSf(message.sessionId);
      availableNumbers = {
        responseFromSFForNumCheck: { data: { AvailableNo: [num] } },
        instanceUrl: responseFromGetConnentToSf?.responseFromSFForAccessToken?.data?.instance_url,
        accessToken: responseFromGetConnentToSf?.responseFromSFForAccessToken?.data?.access_token,
        userId: responseFromGetConnentToSf?.userId
      };
    }

    
    }else{
      console.log("group edit message");
      const responseFromGetConnentToSf = await getConnectToSf(message.sessionId);

      availableNumbers = {
        instanceUrl: responseFromGetConnentToSf?.responseFromSFForAccessToken?.data?.instance_url,
        accessToken: responseFromGetConnentToSf?.responseFromSFForAccessToken?.data?.access_token,
      };
    }
    
    
    console.log("availableNumbers -------------", availableNumbers?.responseFromSFForNumCheck?.data?.AvailableNo);

    if (
      (availableNumbers?.responseFromSFForNumCheck?.data?.AvailableNo?.length > 0 || message?.sfGroupId )&& message?.fromNumber &&
      availableNumbers?.instanceUrl &&
      availableNumbers?.accessToken
    ) {
      const instanceUrl = availableNumbers?.instanceUrl;
      const accessToken = availableNumbers?.accessToken;
      const SF_Headers = {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/JSON',
      };
      let timestamp = getMessageTime(message?.messageTimestamp);
      let updateObj = {
        tdc_tsw__Message_Text_New__c: message?.message,
        // tdc_tsw__Is_Edit__c: true,
        Name: message?.type === "Incoming" ? "Incoming" : "Outgoing",
        tdc_tsw__MessageId__c: message?.messageId,
        tdc_tsw__Channel__c: "WhatsApp: Personal",
        tdc_tsw__Group_Chat__c: message?.sfGroupId,
        tdc_tsw__Source__c: "Mobile - WhatsApp Personal",
        tdc_tsw__ToNumber__c: message?.toNumber,
        tdc_tsw__Sender_Number__c: message?.fromNumber,
        tdc_tsw__Message_Time__c: timestamp,
        tdc_tsw__Status__c: "Edited" ,
        attributes: { "type": "tdc_tsw__Message__c", "referenceId": message?.messageId }  
      };
      console.log("updateObj for edited message....................", updateObj);
      await sendEditMSGTOSF(message.fromNumber, message.messageId, instanceUrl, SF_Headers, updateObj , message.sessionId);
    }
    
  } catch (error) {
    
  }
}

export async function sendEditMSGTOSF(fromNumber, messageId, instanceUrl, SF_Headers, updateObj, sessionId) {
  let recordQury = querySF.getRecordIdOfSMS(fromNumber, messageId);
  let url = sf_LoginURL.queryObj(instanceUrl, recordQury);
  let recordId = await callSFApi(sessionId, url, SF_Headers, {}, 'get');
  recordId = recordId?.data?.records[0]?.Id;
  console.log("recordid.....", recordId);
  const updateUrl = sf_LoginURL.updateObj(instanceUrl, recordId);

  const res = await callSFApi(sessionId, updateUrl, SF_Headers, updateObj, 'patch');
   console.log("res status of edit msg patch request....", res?.status);
  return updateUrl;

}

async function getcontentVersionId(messageOfMobile, accessToken, instanceUrl) {

  try {
    let ContentDocumentId, name, nameId;
    const fileExtension = mime.extension(messageOfMobile?.mimetype);
    console.log("fileExtension---", fileExtension);
    name = `360SMS${Date.now()}.${fileExtension}`;
    if (!fileExtension || fileExtension === 'undefined' || fileExtension === 'null') {
      return {};
    }
    nameId = fileNameExtension(fileExtension);
    console.log("name and nameId---", name, nameId);
    const formData = new FormData();
    const metadata = {
      Title: name,
      PathOnClient: name
    };
    const fileBuffer = Buffer.from(messageOfMobile?.image, 'base64');
    const fileStream = Readable.from(fileBuffer);

    formData.append('entity_content', JSON.stringify(metadata), {
      contentType: 'application/json'
    });

    formData.append('VersionData', fileStream, {
      filename: name,
      contentType: messageOfMobile?.mimetype,
      knownLength: fileBuffer.length
    });
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      ...formData.getHeaders()
    };
    const sf_headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/JSON'
    };
    const sf_URlForContentVersion = `${instanceUrl}/services/data/v58.0/sobjects/ContentVersion`;

    let responseFromSFForNumCheck = await callSFApi(messageOfMobile.sessionId, sf_URlForContentVersion, headers, formData, 'form-data');

    if (responseFromSFForNumCheck?.data?.id) {
      const sfUrlForContent = `${instanceUrl}/services/data/v54.0/query?q=SELECT+ID+,+Title+,+ContentDocumentId+FROM+ContentVersion+WHERE+ID+=+'${responseFromSFForNumCheck?.data?.id}'`
      const responseContentVersionQuery = await callSFApi(messageOfMobile.sessionId, sfUrlForContent, sf_headers, {}, 'get');
      ContentDocumentId = responseContentVersionQuery?.data?.records[0]?.ContentDocumentId;
      console.log("ContentDocumentId---", ContentDocumentId);
    }
    return { ContentDocumentId, name, nameId };
  } catch (error) {
    console.log("Error in getting content version id");
    // const errorobj = {
    //   error_type: "General Error",
    //   error_code: "400",
    //   error_message: "Error in getting content version id"
    // }
    // new errorRecord(errorobj).save();
    return {};

  }
};

export async function sendDelivery(arrOfDelivery, needFromSf = false) {
  try {
    if (arrOfDelivery && arrOfDelivery.length > 0) {
      for (const objOfDelivery of arrOfDelivery) {
        const getAccessAndInstance = await getConnectToSf(
          objOfDelivery.sessionId,
          needFromSf
        );
        let instanceUrl, accessToken;
        if (
          getAccessAndInstance &&
          getAccessAndInstance?.responseFromSFForAccessToken?.data &&
          getAccessAndInstance?.responseFromSFForAccessToken?.data
            .instance_url &&
          getAccessAndInstance?.responseFromSFForAccessToken?.data.access_token
        ) {
          const messageId = objOfDelivery?.messageId;
          instanceUrl =
            getAccessAndInstance?.responseFromSFForAccessToken?.data
              .instance_url;
          accessToken =
            getAccessAndInstance?.responseFromSFForAccessToken?.data
              .access_token;
          const status = objOfDelivery?.status;
          let deliveryObj = {
            type: "Delivery",
            FromNumber: objOfDelivery?.senderNumber,
            WhatsAppSyncDate: objOfDelivery?.deliveryTimestamp,
            DeliveryStatus: [{ messageId: messageId, status: status }],
          };

          console.log("deliveryObj---", deliveryObj);
          const SF_Headers = {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/JSON",
          };

          const sf_URl = `${instanceUrl}/services/apexrest/tdc_tsw/WebWhatsAppSync`;
          setTimeout(async () => {
            const deliveryResult = await postRequest(
              SF_Headers,
              sf_URl,
              deliveryObj
            );
            if (
              deliveryResult &&
              deliveryResult?.response &&
              deliveryResult?.response?.status === 401 &&
              Array.isArray(deliveryResult.response.data) &&
              deliveryResult.response.data[0]?.errorCode ===
                "INVALID_SESSION_ID"
            ) {
              sendDelivery(arrOfDelivery, true);
            }
          }, 30 * 1000);
        } else {
        }
      }
    }
  } catch (error) {
    console.log("Error in sendDelivery ******************", error);
    const errorobj = {
      error_type: "General Error",
      error_code: "400",
      error_message: "Error in sending delivery status in salesforce",
    };
    //new errorRecord(errorobj).save();
  }
}

function fileNameExtension(fileExtension) {
  if (fileExtension.includes("pdf")) {
    return "pdf_60.png";
  } else if (fileExtension.includes("text") || fileExtension.includes("txt")) {
    return "txt_60.png";
  } else if (
    fileExtension.includes("x-vcard") ||
    fileExtension.includes("vcf")
  ) {
    return "vcf_60.png";
  } else if (fileExtension.includes("csv")) {
    return "csv_60.png";
  } else if (fileExtension.includes("image") || fileExtension.includes("jpg")) {
    return "image_60.png";
  } else if (
    ["audio", "mp3", "wav", "aac", "mpeg", "mpg", "oga", "ogg"].some((ext) =>
      fileExtension.includes(ext)
    )
  ) {
    return "audio_60.png";
  } else if (
    ["video", "mp4", "wmv", "mov", "avi"].some((ext) =>
      fileExtension.includes(ext)
    )
  ) {
    return "video_60.png";
  } else if (
    fileExtension.includes("msword") ||
    fileExtension.includes("word_x") ||
    fileExtension.includes("docx")
  ) {
    return "word_60.png";
  } else if (
    ["vnd.ms-e", "sheet", "xls", "excel_x"].some((ext) =>
      fileExtension.includes(ext)
    )
  ) {
    return "excel_60.png";
  } else if (
    fileExtension.includes("vnd.ms-powerpoint") ||
    fileExtension.includes("ppt")
  ) {
    return "ppt_60.png";
  } else {
    return "image_60.png";
  }
}



export const updateSFUserLogTime=async(sessionId,data,needFromSf=false)=>{
    let sfResponse=await getConnectToSf(sessionId,needFromSf);
    console.log("WA LOG.............................",data);
    let instanceUrl, accessToken;
      if (sfResponse?.responseFromSFForAccessToken && sfResponse?.responseFromSFForAccessToken?.data && sfResponse?.responseFromSFForAccessToken.data.instance_url && sfResponse?.responseFromSFForAccessToken.data.access_token) {

        instanceUrl = sfResponse.responseFromSFForAccessToken.data.instance_url;
        accessToken = sfResponse.responseFromSFForAccessToken.data.access_token;
        const url=`${instanceUrl}/services/apexrest/x360I/WebWAUserLog`;
        const headers={
            Authorization:`Bearer ${accessToken}`,
            'Content-Type': 'application/JSON'
        }
        //console.log("log user.....................................",url,headers,data);
        let res=await postRequest(headers,url,data);
        if(res && res?.response && res?.response?.status === 401 && Array.isArray(res.response.data) && res.response.data[0]?.errorCode === 'INVALID_SESSION_ID'){
          await  updateSFUserLogTime(sessionId,data,true);
        }
      }
    




}

export const sendGroupParticipantsUpdateToSF = async (
  groupId,
  action,
  participantNumber,
  performedBy,
  sessionId,
  needFromSf = false
) => {
  try {
    if (sessionId && groupId && action && participantNumber) {
      const getAccessAndInstance = await getConnectToSf(sessionId , needFromSf);

      const userSessionData = await userModel.findOne({
        sessionid: sessionId,
      });
      const namespace = userSessionData?.custom_namespace || "tdc_tsw";

      let instanceUrl, accessToken;
      if (
        getAccessAndInstance?.responseFromSFForAccessToken &&
        getAccessAndInstance?.responseFromSFForAccessToken?.data &&
        getAccessAndInstance?.responseFromSFForAccessToken.data.instance_url &&
        getAccessAndInstance?.responseFromSFForAccessToken.data.access_token
      ) {
        instanceUrl =
          getAccessAndInstance.responseFromSFForAccessToken.data.instance_url;
        accessToken =
          getAccessAndInstance.responseFromSFForAccessToken.data.access_token;

        const groupParticpantObj = {
          groupid: groupId,
          action: action,
          participant: participantNumber,
          performedBy: performedBy,
          type: "groupParticipantUpdate",
        };
        console.log("groupParticpantObj---", groupParticpantObj);

        const sf_urlForGroupParticipantUpdate = `${instanceUrl}/services/apexrest/${namespace}/WebWhatsAppSync`;
        const SF_Headers = {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/JSON",
        };

        let responseFromGroupParticipantUpdate = await postRequest(
          SF_Headers,
          sf_urlForGroupParticipantUpdate,
          groupParticpantObj
        );
        if (
          responseFromGroupParticipantUpdate &&
          responseFromGroupParticipantUpdate?.response &&
          responseFromGroupParticipantUpdate?.response?.status === 401 &&
          Array.isArray(responseFromGroupParticipantUpdate.response.data) &&
          responseFromGroupParticipantUpdate.response.data[0]?.errorCode ===
            "INVALID_SESSION_ID"
        ) {
          responseFromGroupParticipantUpdate = await sendGroupParticipantsUpdateToSF(
            groupId,
            action,
            participantNumber,
            performedBy,
            sessionId,
            true
          );
          return responseFromGroupParticipantUpdate;
        }
        return responseFromGroupParticipantUpdate;
      } else {
        console.log(
          "Error in the updating group participant",
          "istanceUrl accessToken is not sent"
        );
      }
    } else {
      console.log(
        "Error in the updating group participant",
        "sessionId groupId action participantNumber is not sent"
      );
      const errorobj = {
        error_type: "General Error",
        error_code: "400",
        error_message: "sessionId groupId action participantNumber is not sent",
      };
      new errorRecord(errorobj).save();
      return {};
    }
  } catch (error) {
    console.log("Error in the updating group participant", error);
    const errorobj = {
      error_type: "General Error",
      error_code: "400",
      error_message: "Error in the updating group participant",
    };
    new errorRecord(errorobj).save();
    return {};
  }
};