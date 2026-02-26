import userModel from "../models/user.model";
import checkNumbersModel from "../models/checkNumbers.model";

export const getMessageTime = (time) => {
    console.log("time.................",time);
  
    let timestamp;
    if(time)
      timestamp = time < 1e11   ? time * 1000 : time;
    else
      timestamp = generateTimeStamp();
    const date = new Date(timestamp);
    let isoString = date.toISOString();
    console.log("iso format.....",isoString);
    isoString = isoString.replace("Z", "+0000");
    return isoString;
  };
  
  export const generateTimeStamp=()=>{
      const nowMilliseconds = Date.now();
      const low = Math.floor(nowMilliseconds / 1000); 
      const high = (nowMilliseconds % 1000) * 1e6; 
      const messageTimestamp = {
                  low: low,     
                  high: high,   
                };
      //console.log('Generated Timestamp:', messageTimestamp);
    const milliseconds = (messageTimestamp.low * 1000) + Math.floor(messageTimestamp.high / 1e6);
    const seconds = milliseconds ? Math.floor(milliseconds / 1000) : milliseconds;
    return seconds;
  
  }
  
  function convertGMTStringToCustomFormat() {
    const now = new Date();
    const gmtString = now.toGMTString();
  
    const parts = gmtString.split(" ");
    const day = parts[1];
    const month = parts[2];
    const year = parts[3];
    const time = parts[4];
    const monthMap = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      May: "05",
      Jun: "06",
      Jul: "07",
      Aug: "08",
      Sep: "09",
      Oct: "10",
      Nov: "11",
      Dec: "12",
    };
    const monthNumber = monthMap[month];
  
    return `${year}-${monthNumber}-${day} ${time}`;
  }
  
  export const saveUserLogTime = async (sessionId, isLogInTime) => {
    const time = generateTimeStamp();
    const userid = sessionId?.slice(18, 33);
    const log = isLogInTime ? { logInTime: time } : { logOutTime: time };
    const date = convertGMTStringToCustomFormat();
    const sfLog = isLogInTime ? { LogInTime: date } : { LogOutTime: date };
    const data = { UserId: userid, ...sfLog };
    await updateSFUserLogTime(sessionId, data);
  };
  
  export const manageUserSession = async (phone_id, isLogin) => {
    try {
      const phoneDetails = await cacheGet(phone_id);
      console.log(
        phone_id,
        "phone details...........................",
        phoneDetails
      );
      const sessionId = phoneDetails?.sessionId;
      if (isLogin) {
        await saveUserLogTime(sessionId, true);
      } else {
        await saveUserLogTime(sessionId, false);
        await cacheDelete(phone_id);
      }
    } catch (err) {
      console.log("error in manageUserSession...", err.message);
    }
  };
  // export const getMessageId=(messageId)=>{
  //   const parts = messageId.split("_");
  //   const fromMe = parts[0];
  //   const toNumber = parts[1].replace("@c.us", "");
  //   const messageId = parts[2];
  
  // }
  
  export const isGroupSupported = async (sessionId) => {
    const record = await userModel.findOne({ sessionId : sessionId });
    if (!record) {
      return false;
    }
    return record.isGroupSupported ?? false;
  };
  
  export const getNumAvailability = async (sessionId, number) => {
    console.log("inside get Number Availibilty ===============", sessionId, number);
    const record = await checkNumbersModel.findOne({ sessionId : sessionId , number });
    if (!record) {
      // If the record does not exist in the database
      return "NOT_EXIST";
    }
  
    // If the record exists, return the value of sf_groupId (can be null or false)
    return record.isAvailable ?? null;
  };
  
  export const getGroupAvailability = async (sessionId, number) => {
    const record = await checkNumbersModel.findOne({ sessionId , number });
    if (!record) {
      // If the record does not exist in the database
      return "NOT_EXIST";
    }
    // If the record exists, return the value of sf_groupId (can be null or false)
    return record.sf_groupId ?? null;
  };