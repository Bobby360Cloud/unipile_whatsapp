import { userModel } from "../models/user.model.js";

export const getSessionFromValidOrgUser = async (orgId, userId , namespace) => {
  let validObj = {};
  validObj['isValidOrgUser'] = ((orgId && orgId.startsWith('00D') && orgId.length == 18) && (userId && userId.startsWith('005') && userId.length == 18));
  if (validObj.isValidOrgUser) {
    validObj['sessionId'] = String(orgId) + String(userId);

    const userData = await userModel.findOneAndUpdate({ "sessionId": validObj.sessionId },{$set: { "orgId": orgId, "userId": userId,sessionId:validObj.sessionId , "custom_namespace" : namespace}},{ new: true,upsert: true });
    // const sessionData = await cacheGet(userData?.phone_id);
    // console.log(sessionData);
    // validObj['loggedIn'] = sessionData?.status;
    validObj['userExist'] = userData;
    // validObj['userSession'] =(sessionData?.status && sessionData?.sessionId && sessionData?.activeNumber)? true : false;
    // if(sessionData?.status)
      console.log(validObj); 
    return validObj;
    // if (userData?.phone_id && !validObj['loggedIn']) {
    //   const status = await getPhoneStatus(userData.phone_id, validObj.sessionId);
    //   console.log("status..........................", status);
    //   await updateCacheObject(userData.phone_id , {status: status?.status?.loggedIn , activeNumber:status?.number});
    //   if (status) {
    //     validObj['loggedIn'] = status?.status?.loggedIn;
    //   };
    //   const newsessionData = await cacheGet(userData?.phone_id);
    //   console.log("new data----", newsessionData);
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


