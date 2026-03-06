import userModel from '../models/user.model';


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