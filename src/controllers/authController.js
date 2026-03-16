import { UnipileClient } from 'unipile-node-sdk';
import config from '../configs/config';
import { makeRequest } from "../helpers/request"
import { getSessionFromValidOrgUser } from '../helpers/validator';
import userModel from '../models/user.model';
import constants, { unipileHeaders } from '../helpers/constants';
import checkNumbersModel from '../models/checkNumbers.model';
import { manageUnipileLogin, manageUnipileLogout, saveUserLogTime } from '../helpers/helper';
import accountModel from '../models/account.model'

export async function getQr(req, res) {

  try {
    const { sessionId, userExist, orgId, userId, namespace, loggedIn } = req.validData;
    console.log("sessionId..........................", sessionId);
    console.log("user")
    if (loggedIn) {
      return res.render("authenticated", { status: 200, message: "You are authenticated." });
    }else{
       await userModel.findOneAndUpdate(
            { sessionId: sessionId },
            {
                $set: {
                    orgId: orgId,
                    userId: userId,
                    custom_namespace: namespace

                }
            },
            { upsert: true, new: true })
      return res.render("scan", { HOST: process.env.APP_HOST, orgId, userId });
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
    await getSessionFromValidOrgUser(orgId, userId,true);
  if (!isValidOrgUser) {
    res.render("authenticated", { "status": 400, "message": "Please provide a valid Organisation Id or User Id" });
    return
  }

  req.validData = { isValidOrgUser, sessionId, userExist, loggedIn, orgId, userId, namespace };
  next();
};

export const validateRequest = async (req, res, next) => {
  const orgId = req?.body?.orgid || req?.query?.orgid;
  const userId = req?.body?.userid || req?.query?.userid;
  const { isValidOrgUser, sessionId, userExist, loggedIn } =
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
  req.body.userExist = userExist;
  next();
};


export async function webhook(req, res) {
  console.log(" Account Webhook received:", req.body);
  if (req.body && req.body?.AccountStatus && req?.body?.AccountStatus?.account_type === 'WHATSAPP') {
    const { AccountStatus } = req.body;
    console.log(`Account ${AccountStatus?.account_id} status changed to: ${AccountStatus?.message}`);
    if (AccountStatus?.message === 'CONNECTING') {
      // Perform actions for connecting status
      // setup loader functionality
    }else if (AccountStatus?.message === 'OK' && AccountStatus?.account_id) {
        await manageUnipileLogin(AccountStatus.account_id) 
    } else if (AccountStatus?.message === 'SYNC_SUCCESS') {
      // if want to show syncing on 
    } else if (AccountStatus?.message === 'CREDENTIALS' && req.body?.reason === 'Disconnected' && AccountStatus?.account_id) {
      await manageUnipileLogout(AccountStatus.account_id);
    }
  }
  res.status(200).send('Webhook received');
}


export async function checkSession(req, res) {
  try {
    const orgId = req && req.query && req.query.orgid;
    const userId = req && req.query && req.query.userid;
    const { isValidOrgUser, loggedIn } =
      await getSessionFromValidOrgUser(orgId, userId);
    if (!isValidOrgUser) {
      return res.json({
        status: 400,
        message: "Please provide a valid Organisation Id or User Id",
      });
    }

    if (loggedIn) {
      res.json({ status: 200, message: `Session is Active` });
    } else {
      res.json({ status: 400, message: `Session is not active` });
    }
  } catch (e) {
    res.json({ status: 400, message: "Error while getting session" });
  }
}

export const checkOrgUserStatus = async (req, res) => {
  try {
    console.log("req---", req.body);
    //need userId as well....
    if (req && req.body && req.body.orgId) {
      const orgId = req.body.orgId;
      const totalUsersForOrg = await userModel.find({
        sessionId: { $regex: `^${orgId}` },
      });
      let infoAboutOrg = [];
      if (totalUsersForOrg && totalUsersForOrg.length > 0) {
  for (const user of totalUsersForOrg) {
    const accountDetails = await accountModel.findOne({
      sessionId: user.sessionId
    });

    infoAboutOrg.push({
      userId: user.userId,
      orgId: user.orgId,
      loggedIn: accountDetails?.loggedIn ? true : false
      });
      }
      } 
        if(infoAboutOrg.length > 0){
        res.status(200).json({ infoAboutOrg: infoAboutOrg });
        }
        res.status(200).json({ message: "No users found for the given org id" });


    }else {
      return res.json({
        status: 400,
        message: "Please provide a valid Organisation Id",
      });
    }

  }
  catch (e) {
    console.log("error in the checkOrgUserStatus ---", e);
    res.status(400).json({ error: true });
  }
}
