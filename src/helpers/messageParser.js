import userModel from "../models/user.model";
import constants ,{ createMessageObj, unipileHeaders }   from "./constants";
import makeRequest from "./request";
import { sendMobIncomingOutgoingMsgToSF } from "./sfhelper";
import { fileTypeFromBuffer } from "file-type";


export const oneToOneMessageParser = async (message) =>
    {
        try {
            const accountId = message?.account_id;
            if(!accountId) return ;
            const userRec = await userModel.findOne({account_id : accountId});
            if(!userRec) throw new Error (" user rzecord not exist for the user !!!!");
            const sessionId = userRec?.sessionId;
            if (!sessionId) {
                console.log("Session ID not found for phone ID:", phone);
                return;
              }
            let toNumber = message?.attendees?.[0]?.attendee_specifics?.phone_number;
            if (toNumber && toNumber.startsWith("+")) {
                toNumber = toNumber.slice(1);
            }

            let fromNumber = message?.sender?.attendee_specifics?.phone_number;
            if (fromNumber && fromNumber.startsWith("+")) {
                fromNumber = fromNumber.slice(1);
            }
            const messageObj = new createMessageObj(sessionId);
            
              const text = message?.message;
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
            console.log("attachment========== out")
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
                console.log("response for attachment =================", response?.data);
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