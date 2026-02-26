import { UnipileClient } from 'unipile-node-sdk';
import config from '../configs/config';
import {makeRequest } from "../helpers/request"
import QRCode from 'qrcode';
import { getSessionFromValidOrgUser } from '../helpers/validator';
import userModel from '../models/user.model';
import constants , {unipileHeaders} from '../helpers/constants';
import checkNumbersModel from '../models/checkNumbers.model';
import { saveUserLogTime } from '../helpers/helper';

export async function getQr(req, res) {

  try {
    const {sessionId,userExist,orgId,userId,namespace , loggedIn}=req.validData;
    console.log("sessionId..........................", sessionId);
    console.log("user")
    if(loggedIn) {
      return res.render("authenticated", {status : 200, message: "You are authenticated."});
    }
    
  
const url = constants.routes_Url.getQr 
const reqData = {
  method : 'post',
  url : url ,
  headers : unipileHeaders,
  data : {
     "provider": "WHATSAPP"
  }
}
const qrRes = await makeRequest(reqData) ;
console.log("accountDetails =============", qrRes?.data);
const qrCodeText = qrRes?.data?.checkpoint?.qrcode ;

  if(!qrCodeText){
    return res.render("error", {
      message: "couldn't generate qr",
      error: "error",
    });
  }
  // Step 2 — convert QR text → PNG Base64
  const qr = await QRCode.toDataURL(qrCodeText);
  if(qr && qrRes?.data?.account_id){
    await userModel.findOneAndUpdate(
      { sessionId: sessionId },
      {
        $set: {
          orgId: orgId,
          userId: userId,
          custom_namespace  : namespace,
          account_id : qrRes.data.account_id
        }
      },
      { upsert: true, new: true }
    );
      console.log("Generated QR Code:");
  // Step 3 — render in EJS
  return res.render("scan", { src: qr });
  }else {
    return res.render("authenticated", {status : 200, message: "Could not generate qr at the moment. Try again after some time."});
  }

 

  }
catch (error) {
  console.log("error on displaying the qr", error);
  return res.render("error", { message: error?.message, error: error });
}
}


export const validateQRRequest = async (req, res, next) => {
  const orgId = req && req.query && req.query.orgid;
  const userId = req && req.query && req.query.userid;
  const namespace = req?.query?.namespace || 'tdc_tsw';
  const { isValidOrgUser, sessionId, userExist, loggedIn } =
    await getSessionFromValidOrgUser(orgId, userId);
  if (!isValidOrgUser) {
    res.render("authenticated",{ "status": 400, "message": "Please provide a valid Organisation Id or User Id" });
    return
  }

  req.validData = { isValidOrgUser, sessionId, userExist,loggedIn, orgId, userId , namespace};
  next();
};

export const validateRequest = async (req, res, next) => {
  const orgId = req?.body?.orgid || req?.query?.orgid;
  const userId = req?.body?.userid || req?.query?.userid;
  const { isValidOrgUser, sessionId, userExits, loggedIn } =
    await getSessionFromValidOrgUser(orgId, userId);
  if (!isValidOrgUser) {
    res.json({
      status: 400,
      message: "Please provide a valid Organisation Id or User Id",
    });
    return;
  }
  if (!loggedIn) return res.json({ status: 400, message: "Inative Session" });
  req.body.sessionId = sessionId;
  // req.body.userExits = userExits;
  // req.body.orgId = orgId;
  // req.body.userId = userId;
  next();
};


export async function webhook(req, res) {
  console.log(" Account Webhook received:", req.body);
  if (req.body && req.body?.AccountStatus && req?.body?.AccountStatus?.account_type === 'WHATSAPP') {
    const { AccountStatus } = req.body;
    console.log(`Account ${AccountStatus?.account_id} status changed to: ${AccountStatus?.message}`);
    // Handle different account statuses as needed
    if(AccountStatus?.message === 'CONNECTING') {
      // Perform actions for connecting status
      // setup loader functionality
    }
    else if(AccountStatus?.message === 'OK' && AccountStatus?.account_id) {

      // Perform actions for connected status
      const url = constants.routes_Url.getAccountDetail(AccountStatus?.account_id);
      const reqData = {
        method : 'get',
        url : url ,
        headers : unipileHeaders
      }
      const accountDeatils = await makeRequest(reqData) ;
      console.log("accountDetails =============", accountDeatils?.data);
      if(accountDeatils?.data?.name){
        const userDetails = await userModel.findOneAndUpdate({account_id : AccountStatus?.account_id } , {
          $set :{
            number : accountDeatils?.data?.name
          }
        }, {new : true})
        console.log("userDetails on login ========", userDetails);
        await saveUserLogTime (userDetails.sessionId ,true );
      }

            //get number details from api call to provider
      //update user db
    }else if(AccountStatus?.message === 'SYNC_SUCCESS') {
      // Perform actions for disconnected status
      // if want to show syncing on 

    }else if(AccountStatus?.message === 'CREDENTIALS' && req.body?.reason ==='Disconnected' && AccountStatus?.account_id) {
      // Perform actions for disconnected status
    const userDetail =  await userModel.findOneAndUpdate({account_id : AccountStatus?.account_id } , {
        $set :{
          number : null ,
          account_id : null
        }
      }, {new : true})

      console.log("user Details on logout =========================", userDetail);
      if( userDetail?.sessionId){
      await checkNumbersModel.deleteMany({sessionId  : userDetail.sessionId});

      await saveUserLogTime (userDetail.sessionId ,false );
      }
      
      //update user db 
      //delete numbers for logout session
      //delete account from provider end
      const url = constants.routes_Url.getAccountDetail(AccountStatus?.account_id);
      const reqData = {
        method : 'delete',
        url : url ,
        headers : unipileHeaders
      }
      const accountDeatils = await makeRequest(reqData) ;
      console.log("accountDetails delete =============", accountDeatils?.data);

    }
}
  res.status(200).send('Webhook received');
}
