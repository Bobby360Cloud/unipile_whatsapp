import QRCode from 'qrcode';
import {makeRequest} from "./request"
import constants,{unipileHeaders} from "./constants"
import { emitStatus } from "../configs/socketconfig"
import userModel from '../models/user.model';
import accountModel from '../models/account.model';
import config from '../configs/config';

export const handleQRGeneration = async (sessionId) => {
    const url = constants.routes_Url.getQr
    const reqData = {
        method: 'post',
        url: url,
        headers: unipileHeaders,
        data: {
            "provider": "WHATSAPP"
        }
    }
    const qrRes = await makeRequest(reqData);
    console.log("accountDetails =============", qrRes?.data);
    const qrCodeText = qrRes?.data?.checkpoint?.qrcode;
    const qr = await QRCode.toDataURL(qrCodeText);
    if (qr)
        emitStatus(sessionId, { status: 'qr_generated', src: qr });
    else
        emitStatus(sessionId, { status: 'qr_error' });
    if (qr && qrRes?.data?.account_id) {
        await accountModel.findOneAndUpdate(
            { sessionId: sessionId },
            {
                $set: {
                    account_id: qrRes.data.account_id
                }
            },
            { upsert: true, new: true }
        );
    }

}

export const handlewebhookSetup = async(account_id) => {

    try {
        if(!account_id) return;
        await handleAccountWebhookSetup(account_id);
        await handleMessageWebhookSetup(account_id);
    } catch (error) {
        console.error("Error setting up webhooks:", error.message);
    }


}

const handleAccountWebhookSetup = async (account_id) => {
  try {

    const url = constants.routes_Url.setupWebhook(account_id);

    const APP_HOST = config.APP_HOST || "http://localhost:5000";

    const request_url = `${APP_HOST}/webhook`;

    const reqData = {
      method: "post",
      url: url,
      headers: unipileHeaders,
      data: {
        request_url: request_url,
        source: "account_status",
        account_ids: [account_id],
        events: [
          "creation_fail",
          "creation_success",
          "deleted",
          "reconnected",
          "sync_success",
          "stopped",
          "ok",
          "error",
          "credentials",
          "permissions"
        ]
      }
    };

    const webhookRes = await makeRequest(reqData);

    console.log(
      "Account webhook setup response for account:",
      account_id,
      webhookRes?.data
    );

    return webhookRes?.data;

  } catch (error) {
    console.error(
      "Account webhook setup error:",
      error?.response?.data || error.message
    );
  }
};

const handleMessageWebhookSetup = async (account_id) => {
  try {

    const url = constants.routes_Url.setupWebhook(account_id);

    const APP_HOST = config.APP_HOST || "http://localhost:5000";

    const request_url = `${APP_HOST}/msg/webhook`;

    const reqData = {
      method: "post",
      url: url,
      headers: unipileHeaders,
      data: {
        request_url: request_url,
        source: "messaging",
        account_ids: [account_id],
        events: [
          "message_received",
          "message_read",
          "message_reaction",
          "message_edited",
          "message_deleted",
          "message_delivered"
        ]
      }
    };

    const webhookRes = await makeRequest(reqData);

    console.log(
      "Webhook setup response for account:",
      account_id,
      webhookRes?.data
    );

    return webhookRes?.data;

  } catch (error) {
    console.error("Messaging Webhook setup error:", error?.response?.data || error.message);
  }
};

export const getAccountStatus = async (account_id) => {
  try {
    if(!account_id) return;
    const url = constants.routes_Url.getAccountDetail(account_id);

    const reqData = {
      method: "get",
      url: url,
      headers: unipileHeaders
    };

    const accountDetails = await makeRequest(reqData);

    console.log("Account details:", accountDetails?.data);

    return accountDetails?.data;

  } catch (error) {
    console.error(
      "Error fetching account status:",
      error?.response?.data || error.message
    );
    return null;
  }
};