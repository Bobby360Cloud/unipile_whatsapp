
import checkNumbersModel from "../models/checkNumbers.model";




export const bulkUpdateNumbersWithFalse = async (orgId,userId, NumList) => {
    try {
        if (NumList.length > 0) {
        const Numbers = [...NumList];
      
        console.log(
          "bulkUpdateNumbersWithFalse called with orgId:",
          orgId,
          "and Numbers:",
          Array.isArray(Numbers)
        );
      
        const bulkOps = await Promise.all(
          Numbers.map(async number => {
            return {
              updateOne: {
                filter: { 
                  orgId: orgId,
                  userId: userId,
                  number: number
                },
                update: { $set: { isAvailable: false } },
                upsert: true
              }
            };
          })
        );
       await checkNumbersModel.bulkWrite(bulkOps);
      }
      
      } catch (error) {
      console.error(`Error updating numbers with false for orgId: ${orgId}`, error.message);
    }
    };
    
    
    export const bulkUpdateNumbersWithTrue = async (orgId,userId, NumList=[], chatIdList) => {
      try {
      if (NumList.length > 0) {
      const Numbers = [...NumList];
    
      console.log(
        "bulkUpdateNumbersWithTrue called with orgId:",
        orgId,
        "and Numbers:",
        Array.isArray(Numbers)
      );
    
      const bulkOps = await Promise.all(
        Numbers.map(async number => {
          return {
            updateOne: {
              filter: { 
                orgId: orgId,
                userId: userId,
                number: number
              },
              update: { $set: { isAvailable: true } },
              upsert: true
            }
          };
        })
      );
     await checkNumbersModel.bulkWrite(bulkOps);
    }
    
    } catch (error) {
        console.error(`Error updating numbers with true for orgId: ${orgId}`, error.message);
    }
    };

    export const numberUpdateWithTrue = async (orgId,userId, number) => {
        try {
          console.log("numberUpdateWithTrue called with orgId:", orgId,number);
          let rec=await checkNumbersModel.findOneAndUpdate(
            { orgId: orgId,userId: userId, number: number },
            { $set: { isAvailable: true } },
            { upsert: true, new: true }
          );
          console.log("numberUpdateWithTrue updated record:", rec);

        }catch (error) {
            console.error(`Error updating number with true for orgId: ${orgId}`, error.message);
        }
      };
      

    
    
    
    export const bulkUpdateGroup = async (orgId,userId, groupId,sfGroupId, groupName) => {
        const Numbers = [groupId];
        console.log("bulkUpdateGroup called with orgId:", orgId, "and Numbers:", Array.isArray(Numbers));

      const setObj = {
        isAvailable: sfGroupId ? true : false,
        sf_groupId: sfGroupId ? sfGroupId : null 
      }

      if (groupName !== undefined || groupName !== "") {
        setObj.groupName = groupName;
      }

      const bulkOps = Numbers.map(number => ({
        updateOne: {
          filter: { 
            orgId: orgId,
            userId: userId,
            number: number 
          },
          update: { $set: setObj  },
          upsert: true
        }
      }));
      await checkNumbersModel.bulkWrite(bulkOps);
    };
    

