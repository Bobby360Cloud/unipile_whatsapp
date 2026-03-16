import accountModel from "../models/account.model.js";
import userModel  from "../models/user.model.js";
import crypto from "crypto";
import { nodeRefreshTokenUpdateURl } from  "./constants.js" ;
import { postRequest } from "./request.js";

export const getSessionFromValidOrgUser = async (orgId, userId,isQr=false ) => {
  let validObj = {};
  validObj['isValidOrgUser'] = ((orgId && orgId.startsWith('00D') && orgId.length == 18) && (userId && userId.startsWith('005') && userId.length == 18));
  if (validObj.isValidOrgUser) {
    validObj['sessionId'] = String(orgId) + String(userId);

    const userData = await accountModel.findOne(
      { sessionId: validObj.sessionId }
    );
    validObj['userExist'] = userData;
    validObj['loggedIn'] = userData?.number ? true : false   
    if(isQr && userData?.account_id){
      getAccountStatus(userData.account_id).then((res)=>{
        if(res === "CONNECTED"){
          validObj['loggedIn'] = true;
        }{
          //delete logic
        }

    }).catch((err)=>{
      console.log("error in fetching account status", err);
      
    })
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


export const authValidator = async (req, res, next) => {
    try {
      console.log("inside request validator v1===============");
      const authHeader = req?.headers?.authorization;
      const orgId = req?.headers?.orgid;
  
      if (!authHeader || !orgId) {
        return res.status(401).json({
          success: false,
          message: "Authorization failed !!"
        });
      }
  
      // Must be: Bearer <token>
      const parts = authHeader.split(" ");
  
      if (parts.length !== 2 || parts[0] !== "Bearer" || !parts[1]) {
        return res.status(401).json({
          success: false,
          message: "Authorization failed !!"
        });
      }
  
      const token = parts[1];
      const authReqData = {
        "orgid": orgId,
        "productName":"360 SMS",
      }

      const headers = {
        "Authorization" : `Bearer ${token}`
      }

      const serverUrl = nodeRefreshTokenUpdateURl(process.env.NODE_AUTHAPP_URL);

      const responseFromNodeServer = await postRequest(headers , serverUrl , authReqData);
      console.log("responseFromNodeServer", responseFromNodeServer?.data);
      if(responseFromNodeServer?.status === 200){
          return next();
      }
      return res.status(401).json({
        success: false,
        message: "Authorization failed !!"
      });

  
     
    } catch (error) {
      console.error("Auth middleware error:", error.message);
      res.status(500).json({
        success: false,
        message: "Authentication middleware failed"
      });
    }
};

