import { UnipileClient } from 'unipile-node-sdk';
import config from '../configs/config';
import { deliveryParser, editMessageParser, groupMessageParser, oneToOneMessageParser } from '../helpers/messageParser';
import constants, { unipileHeaders } from '../helpers/constants';
import makeRequest from '../helpers/request';
import checkNumbersModel from '../models/checkNumbers.model';
import fs from 'fs';
import { numberUpdateWithTrue } from '../helpers/dbhelper';
import https from 'https';

export async function msgWebhook(req, res) {
  const message = req?.body;
  if (message && message.account_type === 'WHATSAPP' && message.is_group === false && message?.event === 'message_received') {
    console.log("Webhook received: for one to one messages ", message?.account_id);
    console.log("Full request body: for one to one messages ", JSON.stringify(req.body, null, 2));
    await oneToOneMessageParser(message);
  } else if (message && message.account_type === 'WHATSAPP' && message.is_group === true && message?.event === 'message_received') {
    console.log("Webhook received: for group messages ", message?.account_id);
    // console.log("Full request body: for group messages ", JSON.stringify(req.body, null, 2));
    await groupMessageParser(message);
  } else if (message && message.account_type === 'WHATSAPP' && message?.event === 'message_edited') {
    console.log("Webhook received: for edit messages ", message?.account_id);
    console.log("Full request body: for edit messages ", JSON.stringify(req.body, null, 2));
    await editMessageParser(message);
  } else if (message && message.account_type === 'WHATSAPP' && (message?.event === 'message_read' || message?.event === 'message_delivered')) {
    console.log("Webhook received: for read messages ", message?.account_id);
    // console.log("Full request body: for deliivery ", JSON.stringify(req.body, null, 2));
    await deliveryParser(message);

  } else if (message && message.account_type === 'WHATSAPP' && message?.event === 'message_deleted') {
    console.log("Webhook received: for delete msg", message?.account_id);
    console.log("Full request body: for delete msg", JSON.stringify(req.body, null, 2));
  }
  else if (message && message.account_type === 'WHATSAPP') {
    console.log("Webhook received: for other messages ");
    console.log("Full request body: for other messages ", JSON.stringify(req.body, null, 2));
  }
  res.status(200).send('Webhook received');
}

const client = new UnipileClient(`https://${config.UNIPILE_DSN}`, `${config.UNIPILE_API_KEY}`);
export async function sendMsgFunc(req, res) {
  try {

    if ((!req?.body?.tonumber && !req?.body?.groupId) || (!req?.body?.message && !req?.body?.fileurl)) {
      return res.json({ status: 400, message: "Please provide all mandatory fields" })
    }
    if (!req.body.userExist) {
      return res.json({ status: 400, message: "User does not exist" })
    }

    const account_id = req.body.userExist.account_id;
    const sessionId = req.body.sessionId;
    const from = req.body.userExist.number;
    const context_message_id = req?.body?.context_message?.context_message_id;
    if (!account_id || !sessionId || !from) {
      return res.json({ status: 400, message: "User does not exist" })
    }
    let number = req.body.tonumber;
    const file = req.body.fileurl;
    const message = req.body.message;
    let groupId = req.body.groupId;
    let urls;
    if (number?.startsWith("+")) {
      number = number.substring(1);
    }
    if (groupId) {
      groupId = groupId?.includes("@g.us") ? groupId : groupId + "@g.us";
    }
    const checkNumber = number ? number : groupId;

    let response;
    const chatRec = await checkNumbersModel.findOne({ sessionId: sessionId, number: checkNumber });
    const chat_id = chatRec?.chat_id;
    if (file) {
      const urlRegex = /https?:\/\/[^\s"']+/g;
      urls = file.match(urlRegex);
    }
    if (urls && urls.length > 0) {
      let count = 1;
      urls.forEach(async (fileu) => {
        console.log("file url found in message body", fileu);
        if (count === urls.length) {
          if (context_message_id && number) {
            response = await sendMsgToWhatsapp(sessionId, number, message, fileu, context_message_id, account_id, chat_id, from);
          } else if (!context_message_id && number) {
            response = await sendMsgToWhatsapp(sessionId, number, message, fileu, null, account_id, chat_id, from);
          } else if (context_message_id && groupId) {
            response = await sendMsgToWhatsapp(sessionId, groupId, message, fileu, context_message_id, account_id, chat_id, from);
          } else if (!context_message_id && groupId) {
            response = await sendMsgToWhatsapp(sessionId, groupId, message, fileu, null, account_id, chat_id, from);
          }
          console.log("response after sending message to whatsapp", response);
          return res.json(response);

        } else
          res.json({ "status": 400, message: 'Error in sending message' });
        count = count + 1;
      });
    } else {
      if (context_message_id && number) {
        response = await sendMsgToWhatsapp(sessionId, number, message, null, context_message_id, account_id, chat_id, from);
      } else if (!context_message_id && number) {
        response = await sendMsgToWhatsapp(sessionId, number, message, null, null, account_id, chat_id, from);
      } else if (context_message_id && groupId) {
        response = await sendMsgToWhatsapp(sessionId, groupId, message, null, context_message_id, account_id, chat_id, from);
      } else if (!context_message_id && groupId) {
        response = await sendMsgToWhatsapp(sessionId, groupId, message, null, null, account_id, chat_id, from);
      }
      console.log("response after sending message to whatsapp", response);
      return res.json(response);
    }






    return response;
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
}

export const sendMsgToWhatsapp = async (sessionId, number, messages, media, contextMessageId, accountId, chat_id, from) => {
  try {

    const data = await getFileData(media, messages);
    console.log(messages, "...........................", media);
    const { message, mimetype, fileName, buffer, contentType } = data;

    console.log("data from getFileData function", data);
    let msgbody = new FormData();
    let chatId = chat_id;

    let sendMsgUrl = chat_id ? constants.routes_Url.sendMsgUrl(chat_id) : constants.routes_Url.startNewChatUrl;
    let attendies_ids = number?.endsWith("@g.us") ? number : number + "@s.whatsapp.net";


    msgbody.append("account_id", accountId);
    msgbody.append("text", message);
    if (!chat_id) {
      msgbody.append("attendees_ids", attendies_ids);
    }
    if (mimetype !== "text") {
      const blob = new Blob([buffer], { type: contentType });
      msgbody.append("attachments", blob, fileName);
    } else {
      msgbody.append("typing_duration", 3000);
    }
    if (contextMessageId) {
      msgbody.append("quote_id", contextMessageId);
    }
    const req = {
      method: "post",
      url: sendMsgUrl,
      headers: {
        ...unipileHeaders,
        "Content-Type": "multipart/form-data"
      },
      data: msgbody
    }
    let sendMesg = await makeRequest(req);

    console.log("send Message to Whatsapp response", sendMesg.data);
    if (sendMesg?.data?.chat_id && !chat_id) {
      chatId = sendMesg.data.chat_id;
      await checkNumbersModel.findOneAndUpdate({ sessionId: sessionId, number: number }, { chat_id: chatId }, { upsert: true, new: true });
    }
    if (sendMesg?.data?.message_id && attendies_ids?.endsWith("@s.whatsapp.net")) {
      let num = number.replace(/\D/g, "");
      await numberUpdateWithTrue(sessionId, num, chatId);
      return {
        status: 200,
        message: `Message successfully sent to ${number}`,
        messageId: sendMesg?.data?.message_id,
        fromNumber: from,
      };
    } else if (sendMesg?.data?.message_id && number?.endsWith("@g.us")) {
      return {
        status: 200,
        message: `Message successfully sent to ${number}`,
        messageId: sendMesg?.data?.message_id,
        senderNumber: from,
        groupId: number,
      }
    } else {
      return { status: 400, message: `Error in sending message` };
    }

  } catch (error) {
    console.log("inside sendMsgToWhatsapp......", error);
    return { status: 401, message: "technical error" };
  }
};


const getFileData = async (fileurl, message) => {
  let data,
    url = {};
  if (fileurl) {

    const reqBody =
    {
      method: "get",
      url: fileurl,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "*/*",
      },

      responseType: "arraybuffer"
    }

    const response = await makeRequest(reqBody);

    console.log("response for file url", response);
    const buffer = response?.data;
    let contentType = response?.headers["content-type"];
    const contentDisposition = response?.headers?.get("Content-Disposition");
    let fileName;
    if (contentType) {
      url = { url: fileurl };
      contentType = contentType.split(";")[0];
      console.log("contentType--", contentType);
      if (
        contentType === "application/pdf" ||
        contentType === "application/zip" ||
        contentType === "application/msword" ||
        contentType === "application/vnd.ms-excel" ||
        contentType === "application/vnd.ms-powerpoint" || contentType.includes("application") || contentType === 'text/html'
      ) {
        data = { url: fileurl, mimetype: "document", buffer: buffer, contentType: contentType };
      } else if (
        contentType === "image/jpeg" ||
        contentType === "image/png" ||
        contentType === "image/gif" ||
        contentType === "image/svg+xml" ||
        contentType === "image/bmp" || contentType.includes("image/")
      ) {
        data = { url: { url: fileurl }, mimetype: "image", buffer: buffer, contentType: contentType };
      } else if (
        contentType === "audio/mpeg" ||
        contentType === "audio/wav" ||
        contentType === "audio/ogg" ||
        contentType === "application/octet-stream" || contentType.includes("audio/")
      ) {
        data = { url: { url: fileurl }, mimetype: "audio", buffer: buffer, contentType: contentType };
      } else if (
        contentType === "video/mp4" ||
        contentType === "video/webm" ||
        contentType === "video/ogg" || contentType.includes("video/")
      ) {
        data = { url: { url: fileurl }, mimetype: "video", buffer: buffer, contentType: contentType };
      } else {
        const obj = { message: "Invalid file type", status: 400 };
        return { obj };
      }
      data.message = message;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/);
        if (match && match[1]) {
          fileName = decodeURIComponent(match[1]);
        }
      }
      data.fileName = fileName ? fileName : `360SMS${Date.now()}`;
      console.log("data.fileName-------------------", data.fileName);
    }
  } else if (message) {
    data = { message, mimetype: "text" };
  }
  return data;
};




export const deleteMsgToWhatsapp = async (req, res) => {
  try {
    const messageId = req?.body?.messageId;
    if (!messageId) {
      return res.json({ status: 400, message: "Please provide all mandatory fields" })
    }

    const deleteUrl = constants.routes_Url.getMessageUrl(messageId);
    const reqBody = {
      method: "delete",
      url: deleteUrl,
      headers: unipileHeaders,
    }
    console.log("request for deleting message", reqBody);
    let deleteMesg = await makeRequest(reqBody);
    if (deleteMesg && deleteMesg.status === 200) {
      return res.json({
        status: 200,
        message: "message deleted successfully",
        messageId: messageId
      });
    } else {
      return res.json({ status: 400, message: `Error in deleting message` });
    }

  } catch (error) {
    console.log(error.message);
    return res.json({ status: 401, message: "technical error" });
  }
};


