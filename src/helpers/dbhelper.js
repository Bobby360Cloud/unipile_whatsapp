
import checkNumbersModel from "../models/checkNumbers.model";




export const bulkUpdateNumbersWithFalse = async (sessionId, NumList) => {
  try {
    if (NumList.length > 0) {
      const Numbers = [...NumList];

      console.log(
        "bulkUpdateNumbersWithFalse called with orgId:",
        sessionId,
        "and Numbers:",
        Array.isArray(Numbers)
      );

      const bulkOps = await Promise.all(
        Numbers.map(async number => {
          return {
            updateOne: {
              filter: {
                sessionId: sessionId,
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
    console.error(`Error updating numbers with false for orgId: ${sessionId}`, error.message);
  }
};


export const bulkUpdateNumbersWithTrue = async (sessionId, NumList = [], chatIdList) => {
  try {
    if (NumList.length > 0) {
      const Numbers = [...NumList];

      console.log(
        "bulkUpdateNumbersWithTrue called with sessionId:",
        sessionId,
        "and Numbers:",
        Array.isArray(Numbers)
      );

      const bulkOps = await Promise.all(
        Numbers.map(async number => {
          return {
            updateOne: {
              filter: {
                sessionId: sessionId,
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
    console.error(`Error updating numbers with true for sessionId: ${sessionId}`, error.message);
  }
};

export const numberUpdateWithTrue = async (sessionId, number, chatId) => {
  try {
    console.log("numberUpdateWithTrue called with sessionId:", sessionId, number, chatId);
    let rec = await checkNumbersModel.findOneAndUpdate(
      { sessionId: sessionId, number: number, chat_id: chatId },
      { $set: { isAvailable: true } },
      { upsert: true, new: true }
    );
    console.log("numberUpdateWithTrue updated record:", rec);

  } catch (error) {
    console.error(`Error updating number with true for sessionId: ${sessionId}`, error.message);
  }
};

export const numberUpdateWithFalse = async (sessionId, number, chatId) => {
  try {
    console.log("numberUpdateWithFalse called with sessionId:", sessionId, number, chatId);
    let rec = await checkNumbersModel.findOneAndUpdate(
      { sessionId: sessionId, number: number, chat_id: chatId },
      { $set: { isAvailable: false } },
      { upsert: true, new: true }
    );
    console.log("numberUpdateWithFalse updated record:", rec);

  } catch (error) {
    console.error(`Error updating number with false for sessionId: ${sessionId}`, error.message);
  }
};





export const updateGroup = async (sessionId, groupId, sfGroupId, groupName, chatId) => {
  try {

    console.log("UpdateGroup called with sessionId:", sessionId, "and group:",groupId );

    const setObj = {
      isAvailable: sfGroupId ? true : false,
      sf_groupId: sfGroupId ? sfGroupId : null,
      chat_id: chatId
    }

    if (groupName !== undefined || groupName !== "") {
      setObj.groupName = groupName;
    }

    const rec = await checkNumbersModel.findOneAndUpdate(
      { sessionId, number : groupId },
      { $set: setObj },
      { upsert: true, new: true }
    );
    console.log("UpdateGroup updated record:", rec);
  } catch (error) {
    console.error(`Error updating group  for sessionId: ${sessionId}`, error.message);
  }
};


