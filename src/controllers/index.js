import accountModel from "../models/account.model";
import { bulkUpdateNumbersWithFalse,bulkUpdateNumbersWithTrue , updateGroup} from "../helpers/dbhelper";
import { CheckAvailableNumbers } from "../helpers/sfhelper";
import constants ,{ unipileHeaders } from  "../helpers/constants";
import makeRequest from "../helpers/request";
import checkNumbersModel from "../models/checkNumbers.model";

export async function updateCheckNumber(req, res) {
    try {
      const orgId = req?.query?.orgid;
      const userId = req?.query?.userid;
    
      if (!orgId || !userId) {
        return res.status(400).send({ status: 400, message: "Please provide a valid Organisation Id" });
      }
      let sessionId = orgId + userId;
      
      console.log(`Starting updateCheckNumber for sessionId: ${sessionId}`);
      const userSession = await accountModel.findOne(
        { sessionId: sessionId,loggedIn: true }
      );
      console.log(`Fetched user session for sessionId: ${sessionId}`, userSession);
  
      if (!userSession?.sessionId) {
        console.log(`No active session found for sessionId: ${sessionId}`);
        return res.status(400).send({ status: 400, message: "No active session found for the org." });
      }
  
      // Process groups (ending with @g.us)
       processGroupsWithPagination(sessionId ,userSession );
  
      // Process  numbers
      processNumbersWithPagination(sessionId);
  
      res.send({ status: 200, message: "Check number update completed successfully." });
    } catch (error) {
      console.log("Error while updating check numbers:", error.message);
      res.status(400).send({ status: 400, message: "Error while updating check numbers" });
    }
  }

  async function processGroupsWithPagination(sessionId , userSession) {
    console.log(`Processing groups for sessionId: ${sessionId}`);
  
    const pageSize = 1000;
    let lastId = null;
    let hasMore = true;
  
    try {
      while (hasMore) {
        const query = {
          sessionId: sessionId,
          number: { $regex: /@g\.us$/ },
          ...(lastId && { _id: { $gt: lastId } })
        };
    
        let records;
        try {
          records = await checkNumbersModel.find(query).sort({ _id: 1 }).limit(pageSize);
        } catch (error) {
          console.log("Error fetching group numbers:", error.message);
          return;
        }
    
        if (records.length === 0) {
          hasMore = false;
          return;
        }
    
        lastId = records[records.length - 1]._id;
    
        for (const record of records) {
          const group = record?.number;
          const groupName = record?.groupName ;
          const chatId = record?.chat_id;
          if (!group || !chatId) continue;
                          const url = constants.routes_Url.getChatAttendies(record.chat_id);
                          const reqBody = {
                              method : "get",
                              url : url ,
                              headers : unipileHeaders,
                          }
          
                          const groupInfo = await makeRequest(reqBody) ;
          if(groupInfo?.data){
            const attendies  = groupInfo?.data?.items;
            let participants = [];
            for(let attendie of attendies){
              participants.push(attendie?.specifics?.phone_number);
            }
            participants = participants.map(n => String(n).replace(/^\+/, ""));
            participants = participants.filter(n => n !== userSession?.number);
            const uniqueParticipants = [...new Set(participants)];
           console.log(`Unique participants for group ${group} are ${uniqueParticipants}`);
          const availableNumbers = await CheckAvailableNumbers(
            sessionId,
            "",
            "",
            uniqueParticipants,
            'pending',
            group,
            groupName
          );
          const newGroupId = availableNumbers?.responseFromSFForNumCheck?.data?.GroupId;
          console.log(` new SF GroupId for ${group}: ${newGroupId}, existing: ${record.sf_groupId}`);
          if ((newGroupId == undefined && record.sf_groupId !== null) || (newGroupId !== undefined && record.sf_groupId == null)) {
            await updateGroup(sessionId, group, newGroupId, groupName, chatId);
          }
          }
        }
      }
    } catch (error) {
      console.log("Error processing groups:", error.message);
      hasMore = false;
      
    }
  }


  async function processNumbersWithPagination(sessionId) {
    console.log(`Processing numbers for sessionId: ${sessionId}`);
  
    const pageSize = 1000;
    let lastId = null;
    let hasMore = true;
  
    try {
      while (hasMore) {
        const query = {
          sessionId: sessionId,
          number: { $not: /@g\.us$/, $ne: null },
          sf_groupId: null,
          ...(lastId && { _id: { $gt: lastId } })
        };
    
        let records;
        try {
          records = await checkNumbersModel.find(query).sort({ _id: 1 }).limit(pageSize);
        } catch (error) {
          console.error("Error fetching numbers:", error.message);
          return;
        }
    
        if (records.length === 0) {
          hasMore = false;
          return;
        }
    
        lastId = records[records.length - 1]._id;
        const BulkUpdateTrue = [];
        const BulkUpdateFalse = [];
        const chunkSize = 9;
        for (let i = 0; i < records.length; i += chunkSize) {
          const chunk = records.slice(i, i + chunkSize);
          const numbers = chunk.map(item => item.number);
    
          let checkResult;
          try {
            checkResult = await CheckAvailableNumbers(
              sessionId,
              "",
              "",
              numbers,
              'pending');
          } catch (error) {
            console.log(`Error checking available numbers for sessionId: ${sessionId}`, error.message);
            return;
          }
          
          const isAvailableList = checkResult?.responseFromSFForNumCheck?.data?.AvailableNo;
          console.log(`CheckAvailableNumbers result for sessionId ${sessionId} and numbers ${JSON.stringify(numbers)}`, isAvailableList);
          if(!Array.isArray(isAvailableList)){
            console.log(`Invalid response for sessionId: ${sessionId}, expected an array but got:`, isAvailableList);
          }
          
    
          for (const record of chunk) {
            const isAvailable = isAvailableList?.includes(record.number);
    
            if (isAvailable && !record.isAvailable ) {
              BulkUpdateTrue.push(record.number);
            } else if (!isAvailable && record.isAvailable ) {
              BulkUpdateFalse.push(record.number);
            }
          }
        }
        console.log(`BulkUpdateTrue for sessionId ${sessionId}:`, BulkUpdateTrue);
        console.log(`BulkUpdateFalse for sessionId ${sessionId}:`, BulkUpdateFalse); 
        try {
          const chunkSizeForUpdate = 50;
              if (BulkUpdateTrue.length > 0) {
                  for (let k = 0; k < BulkUpdateTrue.length; k += chunkSizeForUpdate) { 
                      const chunkToUpdateTrue = BulkUpdateTrue.slice(k, k + chunkSizeForUpdate);
                      await bulkUpdateNumbersWithTrue(sessionId, chunkToUpdateTrue);
                  }
              }
              if (BulkUpdateFalse.length > 0) {
                  for (let l = 0; l < BulkUpdateFalse.length; l += chunkSizeForUpdate) { 
                      const chunkToUpdateFalse = BulkUpdateFalse.slice(l, l + chunkSizeForUpdate);
                      await bulkUpdateNumbersWithFalse(sessionId, chunkToUpdateFalse);
                  }
              }
          } catch (error) {
            console.log(`Error updating numbers for sessionId: ${sessionId}`, error);
          }
    }
    } catch (error) {
      console.log("Error processing numbers:", error.message);
      hasMore = false;
    }
  }