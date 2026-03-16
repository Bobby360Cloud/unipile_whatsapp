import userModel from "../models/user.model";
import constants, { createMessageObj, unipileHeaders, sessionIncomingOutgoing } from "./constants";
import { updateGroup } from "./dbhelper";
import { getGroupAvailability, getGroupName, isGroupSupported } from "./helper";
import makeRequest from "./request";
import { CheckAvailableNumbers, sendDelivery, sendEditedIncomingToSF, sendGroupMessageToSF, sendMobIncomingOutgoingMsgToSF } from "./sfhelper";
import FileType, { fileTypeFromBuffer } from "file-type";
import accountModel from "../models/account.model";


export const oneToOneMessageParser = async (message) => {
  try {
    console.log("inside one to one message parser ====================");
    if (sessionIncomingOutgoing.has(message?.message_id)) return
    const accountId = message?.account_id;
    if (!accountId) return;
    const userRec = await accountModel.findOne({ account_id: accountId });
    if (!userRec) {
      console.log(" Account record does not exist for the user !!!!");
      return;
    }
    const sessionId = userRec?.sessionId;
    if (!sessionId) {
      console.log("Session ID not found for accountId:", accountId);
      return;
    }

    const messageObj = new createMessageObj(sessionId);

    let toNumber = message?.account_info?.phone_number;
    console.log("toNumber before formatting: ", message?.attendees?.[0]?.attendee_specifics);
    if (toNumber && toNumber.startsWith("+")) {
      toNumber = toNumber.slice(1);
    }

    let fromNumber = message?.sender?.attendee_specifics?.phone_number;
    if (fromNumber && fromNumber.startsWith("+")) {
      fromNumber = fromNumber.slice(1);
    }


    const text = message?.message;
    if (text === '-- Unipile cannot display this type of message yet, check the native application --') return
    const fromMe = message?.is_sender;
    const chatId = message?.chat_id;
    if (fromMe)
      toNumber = message?.attendees?.[0]?.attendee_specifics?.phone_number?.replace("+", "");
    console.log("fromMe...................", fromMe);
    messageObj.setMessgeInfo(
      fromMe,
      fromNumber,
      toNumber,
      message?.quoted?.provider_id || "",
      accountId,
      chatId
    );

    const attachments = message?.attachments;
    if (attachments && attachments.length > 0 && attachments?.[0]?.attachment_id) {
      messageObj.setTextMessage(
        message?.message_id,
        text,
        message?.timestamp
      );

      const headers = unipileHeaders;
      const url = constants.routes_Url.getAttachmentUrl(message?.message_id, attachments?.[0]?.attachment_id);
      const reqBody = {
        method: "get",
        url: url,
        headers: headers,
        responseType: "arraybuffer"
      }

      const response = await makeRequest(reqBody);
      const base64String = response?.data?.toString("base64");
      const fileType = await FileType.fromBuffer(response?.data);
      console.log("fileType from file-type package: ", fileType);
      const mimetype = fileType?.mime || attachments?.[0]?.attachment_type;
      const filename = attachments?.[0]?.attachment_name;
      messageObj.setMediaMessage(base64String, mimetype, filename);
    } else {
      messageObj.setTextMessage(message?.message_id, text, message?.timestamp);
    }

    console.log(messageObj);
    if (messageObj?.messageId) {
      sessionIncomingOutgoing.set(messageObj.messageId, true);
      setTimeout(() => {
        sessionIncomingOutgoing.delete(messageObj.messageId);
      }, 5000);
      await sendMobIncomingOutgoingMsgToSF(messageObj);
    }
  } catch (error) {
    console.log("Error in oneToOneMessageParser: ", error);

  }
}



export const groupMessageParser = async (message) => {
  try {
    if (sessionIncomingOutgoing.has(message?.message_id)) return
    const accountId = message?.account_id;
    if (!accountId) return;
    const userRec = await accountModel.findOne({ account_id: accountId });
    if (!userRec) {
      console.log(" Account record does not exist for the user !!!!");
      return;
    }
    const sessionId = userRec?.sessionId;
    if (!sessionId) {
      console.log("Session ID not found for accountId:", accountId);
      return;
    }
    const messageObj = new createMessageObj(sessionId);


    let fromNumber = message?.sender?.attendee_specifics?.phone_number;
    if (fromNumber && fromNumber.startsWith("+")) {
      fromNumber = fromNumber.slice(1);
    }

    let text = message?.message;
    if (text === '-- Unipile cannot display this type of message yet, check the native application --') return
    const fromMe = message?.is_sender;
    const chatId = message?.chat_id;
    const groupId = message?.provider_chat_id;
    let participants = [];
    const groupName = message?.subject;
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
      let phoneNumbers = message?.attendees?.map(
        attendee => attendee.attendee_specifics?.phone_number
      );

      phoneNumbers = phoneNumbers?.filter(
        number => number !== message?.account_info?.phone_number
      );
      participants = phoneNumbers?.map(
        number => number.startsWith("+") ? number.slice(1) : number
      );
      console.log(participants);
    } else if (isGroupAvailable) {
      sfGroupId = isGroupAvailable;

      const GetGroupName = await getGroupName(sessionId, groupId);
      if (groupName && GetGroupName && groupName !== GetGroupName) {
        let phoneNumbers = message?.attendees?.map(
          attendee => attendee.attendee_specifics?.phone_number
        );
        phoneNumbers = phoneNumbers?.filter(
          number => number !== message?.account_info?.phone_number
        );

        console.log(phoneNumbers);
        participants = phoneNumbers?.map(
          number => number.startsWith("+") ? number.slice(1) : number
        );
        console.log(participants);
      }
    } else {
      return;
    }

    messageObj.setGroupMessageInfo(
      fromMe,
      fromNumber,
      participants,
      groupId,
      message?.quoted?.provider_id || "",
      sfGroupId,
      groupName,
      chatId
    );
    const attachments = message?.attachments;
    if (attachments && attachments.length > 0 && attachments?.[0]?.attachment_id) {
      messageObj.setTextMessage(
        message?.message_id,
        text,
        message?.timestamp
      );

      const headers = unipileHeaders;
      const url = constants.routes_Url.getAttachmentUrl(message?.message_id, attachments?.[0]?.attachment_id);
      const reqBody = {
        method: "get",
        url: url,
        headers: headers,
        responseType: "arraybuffer"
      }

      const response = await makeRequest(reqBody);
      // const buffer = await getFileBuffer(message?.url);
      const base64String = response?.data?.toString("base64");
      const fileType = await FileType.fromBuffer(response?.data);
      const mimetype = fileType?.mime || attachments?.[0]?.attachment_type;
      const filename = attachments?.[0]?.attachment_name;
      messageObj.setMediaMessage(base64String, mimetype, filename);
    } else {
      messageObj.setTextMessage(message?.message_id, text, message?.timestamp);
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
      await updateGroup(
        messageObj.sessionId,
        messageObj.groupId,
        getCheckAvailableNumbers?.responseFromSFForNumCheck?.data?.GroupId,
        messageObj.groupName,
        messageObj.chatId
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
    if (messageObj?.sfGroupId && messageObj?.messageId) {
      sessionIncomingOutgoing.set(messageObj.messageId, true);
      setTimeout(() => {
        sessionIncomingOutgoing.delete(messageObj.messageId);
      }, 5000);
      await sendGroupMessageToSF(messageObj);
    }
  } catch (err) {
    console.log(err?.message);
  }
};



export const editMessageParser = async (message) => {
  try {
    const accountId = message?.account_id;
    if (!accountId) return;
    const userRec = await accountModel.findOne({ account_id: accountId });
    if (!userRec) {
      console.log(" Account record does not exist for the user !!!!");
      return;
    }
    const sessionId = userRec?.sessionId;
    if (!sessionId) {
      console.log("Session ID not found for accountId:", accountId);
      return;
    }
    const messageObj = new createMessageObj(sessionId);
    let fromNumber = message?.sender?.attendee_specifics?.phone_number;
    if (fromNumber && fromNumber.startsWith("+")) {
      fromNumber = fromNumber.slice(1);
    }
    let toNumber, groupId;
    const fromMe = message?.is_sender;
    const chatId = message?.chat_id;
    const text = message?.message;
    if (text === '-- Unipile cannot display this type of message yet, check the native application --') return


    if (!message?.is_group) {
      toNumber = message?.is_sender ? message?.attendees?.[0]?.attendee_specifics?.phone_number : message?.account_info?.phone_number;
      if (toNumber && toNumber.startsWith("+")) {
        toNumber = toNumber.slice(1);
      }


      messageObj.setMessgeInfo(
        fromMe,
        fromNumber,
        toNumber,
        message?.quoted?.provider_id || "",
        accountId,
        chatId
      );
      messageObj.setTextMessage(message?.message_id, text, message?.timestamp, true);
    }
    else if (message.is_group) {
      groupId = message?.provider_chat_id;
      let participants = [];
      let sfGroupId = null;
      const groupName = message?.subject;
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
        let phoneNumbers = message?.attendees?.map(
          attendee => attendee.attendee_specifics?.phone_number
        );
        phoneNumbers = phoneNumbers?.filter(
          number => number !== message?.account_info?.phone_number)

        console.log(phoneNumbers);
        participants = phoneNumbers?.map(
          number => number.startsWith("+") ? number.slice(1) : number
        );
        console.log(participants);
      } else if (isGroupAvailable) {
        sfGroupId = isGroupAvailable;
        const GetGroupName = await getGroupName(sessionId, groupId);
        if (groupName && GetGroupName && groupName !== GetGroupName) {
          let phoneNumbers = message?.attendees?.map(
            attendee => attendee.attendee_specifics?.phone_number
          );
          phoneNumbers = phoneNumbers?.filter(
            number => number !== message?.account_info?.phone_number)

          console.log(phoneNumbers);
          participants = phoneNumbers?.map(
            number => number.startsWith("+") ? number.slice(1) : number
          );
          console.log(participants);
        }
      } else {
        return;
      }

      messageObj.setGroupMessageInfo(
        fromMe,
        fromNumber,
        participants,
        groupId,
        message?.quoted?.provider_id || "",
        sfGroupId,
        groupName,
        chatId
      );

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
        await updateGroup(
          messageObj.sessionId,
          messageObj.groupId,
          getCheckAvailableNumbers?.responseFromSFForNumCheck?.data?.GroupId,
          messageObj.groupName,
          messageObj.chatId
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
      messageObj.setTextMessage(
        message?.message_id, text, message?.timestamp, true
      );
    }
    console.log("edit message object....................", messageObj);
    if (messageObj?.messageId && messageObj?.message && messageObj?.sessionId && (messageObj?.sfGroupId || (messageObj?.fromNumber && messageObj?.toNumber))) {
      await sendEditedIncomingToSF(messageObj);
    }
  } catch (error) {
    console.log("error in editMessageParser...", error.message);


  }
}



export const deliveryParser = async (message) => {
  try {
    const accountId = message?.account_id;
    if (!accountId) return;
    const userRec = await accountModel.findOne({ account_id: accountId });
    if (!userRec) {
      console.log(" Account record does not exist for the user !!!!");
      return;
    }
    const sessionId = userRec?.sessionId;
    if (!sessionId) {
      console.log("Session ID not found for accountId:", accountId);
      return;
    }
    const arrOfDelivery = [];
    if (message?.provider_chat_id?.endsWith("@lid") || message?.provider_chat_id?.endsWith("@s.whatsapp.net")) {
      let fromNumber = message?.sender?.attendee_specifics?.phone_number;
      if (fromNumber && fromNumber.startsWith("+")) {
        fromNumber = fromNumber.slice(1);
      }
      let status = "Failed"
      if (message?.event === 'message_delivered') {
        status = "delivered"
      } else if (message?.event === 'message_read') {
        status = "read"
      }
      const delivery = {
        sessionId,
        messageId: message?.message_id,
        status: status,
        deliveryTimestamp: message?.timestamp,
        fromNumber,
      };
      arrOfDelivery.push(delivery);

    }
    await sendDelivery(arrOfDelivery);
  } catch (err) {
    console.log(err.message);
  }
};