import userModel  from "../models/user.model.js";
import crypto from "crypto";

export const getSessionFromValidOrgUser = async (orgId, userId ) => {
  let validObj = {};
  validObj['isValidOrgUser'] = ((orgId && orgId.startsWith('00D') && orgId.length == 18) && (userId && userId.startsWith('005') && userId.length == 18));
  if (validObj.isValidOrgUser) {
    validObj['sessionId'] = String(orgId) + String(userId);

    const userData = await userModel.findOne({sessionId : validObj.sessionId});
    validObj['userExist'] = userData;
    validObj['loggedIn'] =userData?.number ? true : false   
      console.log(validObj); 
    return validObj;
    }
}






export const generateTimeStamp = () => {
  const nowMilliseconds = Date.now();
  const low = Math.floor(nowMilliseconds / 1000);
  const high = (nowMilliseconds % 1000) * 1e6;
  const messageTimestamp = {
    low: low,
    high: high,
  };
  const milliseconds = (messageTimestamp.low * 1000) + Math.floor(messageTimestamp.high / 1e6);
  const seconds = milliseconds ? Math.floor(milliseconds / 1000) : milliseconds;
  return seconds;

}



export const addUserRecord = async (data) => {
  const sessionModel = new userModel(data);
  await sessionModel.save();

}



export function encryptString(clearText) {
  const encryption = process.env.ENCRYPTION_KEY;

  const [ivStr, keyStr] = encryption.split(":");

  const iv = Buffer.from(ivStr, "utf8").slice(0,16);
  const key = Buffer.from(keyStr, "utf8").slice(0,16);
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  let encrypted = cipher.update(clearText, "utf8", "base64");
  encrypted += cipher.final("base64");

  return encrypted;
}


export function getOrgString (orgid){

    try {
        if(!orgid || orgid?.length !== 18){
           throw new Error ("18 digit orgid is required");
        }
        return JSON.stringify({orgid : orgid , expiry : Date.now()});
    } catch (error) {
        
    }
}

