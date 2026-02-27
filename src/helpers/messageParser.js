import userModel from "../models/user.model";
import constants ,{ createMessageObj, unipileHeaders }   from "./constants";
import { bulkUpdateGroup } from "./dbhelper";
import { getGroupAvailability, isGroupSupported } from "./helper";
import makeRequest from "./request";
import { CheckAvailableNumbers, sendGroupMessageToSF, sendMobIncomingOutgoingMsgToSF } from "./sfhelper";
import { fileTypeFromBuffer } from "file-type";


export const oneToOneMessageParser = async (message) =>
    {
        try {
            const accountId = message?.account_id;
            if(!accountId) return ;
            const userRec = await userModel.findOne({account_id : accountId});
            if(!userRec){
              console.log(" user record not exist for the user !!!!");
              return;
            } 
            const sessionId = userRec?.sessionId;
            if (!sessionId) {
                console.log("Session ID not found for phone ID:", phone);
                return;
              }
            
              const messageObj = new createMessageObj(sessionId);
              
            let toNumber = message?.attendees?.[0]?.attendee_specifics?.phone_number;
            if (toNumber && toNumber.startsWith("+")) {
                toNumber = toNumber.slice(1);
            }

            let fromNumber = message?.sender?.attendee_specifics?.phone_number;
            if (fromNumber && fromNumber.startsWith("+")) {
                fromNumber = fromNumber.slice(1);
            }
            
            
              let text = message?.message;
              if (text === '-- Unipile cannot display this type of message yet, check the native application --') return
              const fromMe = message?.is_sender ;
              const chatId = message?.chat_id ;
              console.log("fromMe...................", fromMe);
              messageObj.setMessgeInfo(
                fromMe,
                fromNumber,
                toNumber,
                message?.quoted?.id || "" ,
                accountId, 
                chatId
              );
        
            const attachments = message?.attachments ;
              if (attachments && attachments.length > 0 && attachments?.[0]?.attachment_id) {
                messageObj.setTextMessage(
                  message?.message_id,
                  text,
                  message?.timestamp
                );

                const headers = unipileHeaders ;
                const url = constants.routes_Url.getAttachmentUrl(message?.message_id, attachments?.[0]?.attachment_id);
                const reqBody = {
                    method : "get",
                    url : url ,
                    headers : headers,
                    responseType : "arraybuffer"
                }

                const response = await makeRequest(reqBody) ;
                // const buffer = await getFileBuffer(message?.url);
                const base64String = response?.data?.toString("base64");
                const fileType = await fileTypeFromBuffer(response?.data);
                const mimetype = fileType?.mime || attachments?.[0]?.attachment_type ;
                messageObj.setMediaMessage(base64String , mimetype);
              } else {
                messageObj.setTextMessage(message?.message_id, text ,message?.timestamp);
              }

            console.log(messageObj);
            if (messageObj?.messageId) {
              await sendMobIncomingOutgoingMsgToSF(messageObj);
            }
          } catch (error) {
            
        }
}



export const groupMessageParser = async (message) => {
  try {
    const accountId = message?.account_id;
    if(!accountId) return ;
    const userRec = await userModel.findOne({account_id : accountId});
    if(!userRec){
      console.log(" user record not exist for the user !!!!");
      return;
    } 
    const sessionId = userRec?.sessionId;
    if (!sessionId) {
        console.log("Session ID not found for phone ID:", phone);
        return;
    }
    const messageObj = new createMessageObj(sessionId);


    let fromNumber = message?.sender?.attendee_specifics?.phone_number;
    if (fromNumber && fromNumber.startsWith("+")) {
        fromNumber = fromNumber.slice(1);
    }
    
    let text = message?.message;
    if (text === '-- Unipile cannot display this type of message yet, check the native application --') return
    const fromMe = message?.is_sender ;
    const chatId = message?.chat_id ;
      const groupId = message?.provider_chat_id;
      let participants = [];
      const groupName = message?.subject ;
      let sfGroupId = null;
      const GroupSupported = await isGroupSupported(
        sessionId
      );
      if (!GroupSupported) {
        console.log("Group messaging not supported for this user.");
        return;
      }
      let isGroupAvailable = await getGroupAvailability(
        sessionId,
        groupId
      );
      console.log(
        `isGroupAvailable: ${isGroupAvailable} for groupId: ${groupId} and sessionId: ${sessionId}`
      );
      if (isGroupAvailable === "NOT_EXIST") {
        const phoneNumbers = message?.attendees?.map(
          attendee => attendee.attendee_specifics?.phone_number
        );
        
        console.log(phoneNumbers);
        participants = phoneNumbers?.map(
          number => number.startsWith("+") ? number.slice(1) : a
        );
        console.log(participants);
      } else if (isGroupAvailable) {
        sfGroupId = isGroupAvailable;
      } else {
        return;
      }

      messageObj.setGroupMessageInfo(
        fromMe,
        fromNumber,
        participants,
        groupId,
        message?.quoted?.id || "",
        sfGroupId,
        groupName
      );
      const attachments = message?.attachments ;
      if (attachments && attachments.length > 0 && attachments?.[0]?.attachment_id) {
        messageObj.setTextMessage(
          message?.message_id,
          text,
          message?.timestamp
        );

        const headers = unipileHeaders ;
        const url = constants.routes_Url.getAttachmentUrl(message?.message_id, attachments?.[0]?.attachment_id);
        const reqBody = {
            method : "get",
            url : url ,
            headers : headers,
            responseType : "arraybuffer"
        }

        const response = await makeRequest(reqBody) ;
        // const buffer = await getFileBuffer(message?.url);
        const base64String = response?.data?.toString("base64");
        const fileType = await fileTypeFromBuffer(response?.data);
        const mimetype = fileType?.mime || attachments?.[0]?.attachment_type ;
        messageObj.setMediaMessage(base64String , mimetype);
      } else {
        messageObj.setTextMessage(message?.message_id, text ,message?.timestamp);
      }


      if (participants && participants.length > 0) {
        const getCheckAvailableNumbers = await CheckAvailableNumbers(
          messageObj.sessionId,
          messageObj.messageTimestamp,
          messageObj.fromNumber,
          messageObj.participant,
          messageObj.type,
          messageObj.groupId,
          messageObj.groupName
        );
        await bulkUpdateGroup(
          messageObj.sessionId,
          messageObj.groupId,
          getCheckAvailableNumbers?.responseFromSFForNumCheck?.data?.GroupId,
          messageObj.groupName
        );
        isGroupAvailable = await getGroupAvailability(
          sessionId,
          groupId
        );
        if (isGroupAvailable && isGroupAvailable !== "NOT_EXIST") {
          sfGroupId = isGroupAvailable;
          messageObj.setSFGroupId(sfGroupId);
        }
      }
    console.log(messageObj);
    if (messageObj?.sfGroupId) {
      await sendGroupMessageToSF(messageObj);
    }
  } catch (err) {
    console.log(err?.message);
  }
};
