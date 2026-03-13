import accountModel from "../models/account.model";
import { bulkUpdateNumbersWithFalse,bulkUpdateNumbersWithTrue } from "../helpers/dbhelper";

export async function updateCheckNumber(req, res) {
    try {
      const orgId = req?.query?.orgid;
      const userId = req?.query?.userid;
    
      if (!orgId || !userId) {
        return res.status(400).send({ status: 400, message: "Please provide a valid Organisation Id" });
      }
      let sessionId = orgId + userId;
      
      console.log(`Starting updateCheckNumber for orgId: ${orgId}`);
      const userSession = await accountModel.findOne(
        { sessionId: sessionId,loggedIn: true }
      );
      console.log(`Fetched user session for sessionId: ${sessionId}`, userSession);
  
      if (!userSession?.sessionId) {
        console.log(`No active session found for sessionId: ${sessionId}`);
        return res.status(400).send({ status: 400, message: "No active session found for the org." });
      }
  
      // Process groups (ending with @g.us)
       processGroupsWithPagination(sessionId, userSession);
  
      // Process  numbers
      processNumbersWithPagination(sessionId, userSession);
  
      res.send({ status: 200, message: "Check number update completed successfully." });
    } catch (error) {
      console.log("Error while updating check numbers:", error.message);
      res.status(400).send({ status: 400, message: "Error while updating check numbers" });
    }
  }

  async function processGroupsWithPagination(sessionId, userSession) {
    console.log(`Processing groups for sessionId: ${sessionId}`);
  
    const pageSize = 1000;
    let lastId = null;
    let hasMore = true;
  
    try {
      while (hasMore) {
        const query = {
          orgId: orgId,
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
          const group = record.number;
          const groupName = record.groupName ;
          if (!group) continue;
          const groupInfo = await getGroupInfo(userSession?.sessionId ,group );
          if(groupInfo){
            const participantNumber = groupInfo?.participants?.map((participant) =>
            participant.replace("@c.us", "")
          );
          const availableNumbers = await CheckAvailableNumbers(
            userSession.sessionId,
            "",
            "",
            participantNumber,
            'pending',
            group,
            groupName
          );
          const newGroupId = availableNumbers?.responseFromSFForNumCheck?.data?.GroupId;
          console.log(` new SF GroupId for ${group}: ${newGroupId}, existing: ${record.sf_groupId}`);
          if ((newGroupId == undefined && record.sf_groupId !== null) || (newGroupId !== undefined && record.sf_groupId == null)) {
            await bulkUpdateGroup(orgId, group, newGroupId, groupName);
          }
          }
        }
      }
    } catch (error) {
      console.log("Error processing groups:", error.message);
      hasMore = false;
      
    }
  }


  async function processNumbersWithPagination(sessionId, userSession) {
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
              userSession.sessionId,
              "",
              "",
              numbers,
              'pending');
          } catch (error) {
            console.log(`Error checking available numbers for orgId: ${orgId}`, error.message);
            return;
          }
          
          const isAvailableList = checkResult?.responseFromSFForNumCheck?.data?.AvailableNo;
          console.log(`CheckAvailableNumbers result for orgId ${orgId} and numbers ${JSON.stringify(numbers)}`, isAvailableList);
          if(!Array.isArray(isAvailableList)){
            console.log(`Invalid response for orgId: ${orgId}, expected an array but got:`, isAvailableList);
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
        console.log(`BulkUpdateTrue for orgId ${orgId}:`, BulkUpdateTrue);
        console.log(`BulkUpdateFalse for orgId ${orgId}:`, BulkUpdateFalse); 
        try {
          const chunkSizeForUpdate = 50;
              if (BulkUpdateTrue.length > 0) {
                  for (let k = 0; k < BulkUpdateTrue.length; k += chunkSizeForUpdate) { 
                      const chunkToUpdateTrue = BulkUpdateTrue.slice(k, k + chunkSizeForUpdate);
                      await bulkUpdateNumbersWithTrue(orgId, chunkToUpdateTrue);
                  }
              }
              if (BulkUpdateFalse.length > 0) {
                  for (let l = 0; l < BulkUpdateFalse.length; l += chunkSizeForUpdate) { 
                      const chunkToUpdateFalse = BulkUpdateFalse.slice(l, l + chunkSizeForUpdate);
                      await bulkUpdateNumbersWithFalse(orgId, chunkToUpdateFalse);
                  }
              }
          } catch (error) {
            console.log(`Error updating numbers for orgId: ${orgId}`, error);
          }
    }
    } catch (error) {
      console.log("Error processing numbers:", error.message);
      hasMore = false;
    }
  }