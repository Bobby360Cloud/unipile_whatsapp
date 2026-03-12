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
