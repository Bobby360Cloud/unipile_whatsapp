import { isGroupSupported } from '../helpers/helper';
import userModel from '../models/user.model';
import constants, { unipileHeaders } from '../helpers/constants';
import checkNumbersModel from '../models/checkNumbers.model';


export const groupActivate=async(req,res)=>{
  try{
    const orgId = req && req.query && req.query.orgid;
    const userId = req && req.query && req.query.userid;
    if(!orgId || !userId){
      return res.status(400).json({ message: "orgid and userid are required" });
    }
    const sessionId = `${orgId}${userId}`;
    const userRecData = await userModel.findOne({sessionId});

    if (userRecData) {
       userRecData.isGroupSupported = true;
       await userRecData.save();
       res.status(200).json({ message: "User group activated successfully" });
    } else {
      res.status(404).json({ message: "user not found" });
    }
  } catch {
    res.status(500).json({ message: "Error in the group activation" });
  }
      
}




export const createGroup = async (req, res) => {
  try {

    const sessionId = req?.body?.sessionId;
    if (!req.body.userExist) {
      return res.json({ status: 400, message: "User does not exist" })
    }
    const { groupName, participants } = req?.body;
    const GroupSupported = await isGroupSupported(sessionId);
    if (!GroupSupported) {
      return res.json({ status: 400, message: "Group feature is not supported for this user" });
    }
    if (!groupName || !participants || participants?.length === 0 || !Array.isArray(participants)) {
      return res.json({ status: 400, message: "Group name and participants are required" });
    }
    const numbersArr = participants.map(num => num.replace(/\D/g, ''));
    if (numbersArr.length <= 1) {
      return res.json({ status: 400, message: "At least 2 participant is required to create a group" });
    }
    const account_id = req.body.userExist.account_id;



    let formData = new FormData();
    const url = constants.routes_Url.startNewChatUrl;
    formData.append("account_id", account_id);
    formData.append("subject", groupName);
    for (let i = 0; i < numbersArr.length; i++) {
      formData.append(`attendees_ids`, numbersArr[i] + "@s.whatsapp.net");
    }
    const reqData = {
      method: "post",
      url: url,
      headers: {
        ...unipileHeaders,
        "Content-Type": "multipart/form-data"
      },
      data: formData
    }
    let createGroup = await makeRequest(reqData);
    console.log("create group response ===========", createGroup?.data);
    if (createGroup?.data?.chat_id) {
      const getChatInfoUrl = constants.routes_Url.getChatInfo(createGroup.data.chat_id);
      const reqData = {
        method: "get",
        url: getChatInfoUrl,
        headers: unipileHeaders
      }
      const groupInfo = await makeRequest(reqData);
      if (groupInfo?.data?.id) {
        const groupId = groupInfo.data.id
        return {
          status: 200,
          message: "Group created successfully",
          groupId: groupId
        }


      } else {
        return {
          status: 503,
          message: "Something went wrong.Could not fetch group info",
        }

      }
    } else {
      return {
        status: 500,
        message: "Group creation failed",
      }
    }

    return {
      status: 500,
      message: "Group creation failed",
    }

  } catch (error) {

  }
}



export const addRemoveParticipants = async (req, res)=>{
  const { groupId, participants, action } = req.body;
        const sessionId = req.sessionId;
  try {
    const processedAction = action.trim().toLowerCase();

    // Check if the action is valid
    if (!["add"].includes(processedAction)) {
      throw new Error("Invalid action. Allowed actions are add");
    }
    // Validate groupId
    if (!groupId || !groupId.endsWith("@g.us")) {
      throw new Error("Invalid groupId");
    }
    // Validate participants
    if (
      !participants ||
      participants.length === 0 ||
      !Array.isArray(participants)
    ) {
      throw new Error("Participants array cannot be empty");
    }
    // Remove duplicate participants
    const uniqueParticipants = [...new Set(participants)];
    if (uniqueParticipants.length === 0) {
      throw new Error(
        "At least 1 participant is required to perform the action"
      );
    }
    const chatRec = await checkNumbersModel.findOne({ sessionId, number: groupId });
    if(!chatRec){
      throw new Error("Group not found for the user");
    }
    
    

    const userRec = await userModel.findOne({sessionId});
    if(!groupInfo?.admins?.includes(userRec.number + '@c.us')){
      throw new Error("Only group admins can add/remove participants"); 
    }
    if(userRec?.chat_id){
      for(let i=0; i<uniqueParticipants.length; i++){
      const url = constants.routes_Url.getChatInfo(userRec.chat_id);
      const reqData = {
        method: "patch",
        url: url,
        headers: unipileHeaders,
        data : {
                "action": "addParticipant",
                "value": uniqueParticipants[i] + "@s.whatsapp.net"
              } 
      }
      const response = await makeRequest(reqData);
      console.log(`Group ${processedAction} response for ${uniqueParticipants[i]} ===========`, response?.data);
    }
    const chatInfoUrl = constants.routes_Url.getChatInfo(userRec.chat_id);
    const reqInfo = {
        method: "get",
        url: chatInfoUrl,
        headers: unipileHeaders,
        
      }
      const groupInfo = await makeRequest(reqInfo);
      console.log(`Group ${processedAction} response for ${uniqueParticipants[i]} ===========`, groupInfo?.data);

    }else{
      res.send({
      status: 400,
      message: `User session not found please relogin and try again`,
    });
    }


 
    res.send({
      status: 200,
      message: `Participants ${action} operation completed`,
    });
  } catch (error) {
    console.error("Error in add/remove participants:", error.message);
    res.send({
      status: 403,
      message: `Failed to ${action} participants`,
      error: error.message,
    });
  }
}