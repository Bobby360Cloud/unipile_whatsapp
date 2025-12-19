import { UnipileClient } from 'unipile-node-sdk';
import config from '../configs/config';
import { apiCall, makeRequest } from '../modules/api.module';
import QRCode from 'qrcode';
import { getSessionFromValidOrgUser } from '../helpers/validator';

export async function getQr(req, res) {

  try {
    // const {sessionId,userExist,orgId,userId,namespace , userSession , loggedIn}=req.validData;
    // console.log("sessionId..........................", sessionId);
    // console.log("user")
    // if(userSession || loggedIn) {
    //   res.render("authenticated", {status : 200, message: "You are authenticated."});
    // }
    

  const client = new UnipileClient(`https://${config.unipile_dsn}`, `${config.unipile_api_key}`);

  // Step 1 — start WhatsApp connect
  const whatsappConnect = await client.account.connectWhatsapp();

  const qrCodeText = whatsappConnect?.code;
  if(!qrCodeText){
    res.render("error", {
      message: "couldn't generate qr",
      error: "error",
    });
  }
  // Step 2 — convert QR text → PNG Base64
  const qr = await QRCode.toDataURL(qrCodeText);
  console.log("Generated QR Code:", qr);
  // Step 3 — render in EJS
  res.render("scan", { src: qr });

  }
catch (error) {
  console.log("error on displaying the qr", error);
  res.render("error", { message: error?.message, error: error });
}
}


export async function webhook(req, res) {
  console.log("Webhook received:", req.body);
  if (req.body && req.body?.AccountStatus && req?.body?.AccountStatus?.account_type === 'WHATSAPP') {
    const { AccountStatus } = req.body;
    console.log(`Account ${AccountStatus?.AccountId} status changed to: ${AccountStatus?.message}`);
    // Handle different account statuses as needed
    if(AccountStatus?.message === 'CONNECTING') {
      // Perform actions for connecting status
    }
    else if(AccountStatus?.message === 'OK') {
      // Perform actions for connected status
    }else if(AccountStatus?.message === 'SYNC_SUCCESS') {
      // Perform actions for disconnected status
    }else if(AccountStatus?.message === 'CREDENTIALS' && AccountStatus?.reason ==='Disconnected') {
      // Perform actions for disconnected status
    }
}
  res.status(200).send('Webhook received');
}





// try {
//   const {sessionId,userExist,orgId,userId,namespace , userSession , loggedIn}=req.validData;
//   console.log("sessionId..........................", sessionId);
//   console.log("user")
//   if(userSession || loggedIn) {
//     res.render("authenticated", {status : 200, message: "You are authenticated."});
//   }
//   else if(userExist && userExist.phone_id){
//     const qr= await getQRCode(userExist.phone_id);
//     await  updateCacheObject(userExist.phone_id,{sessionId,namespace,status:false});
//     return res.render("scan", { src: qr });
//   } else {
//     res.render("error", {
//       message: "couldn't generate qr",
//       error: "error",
//     });
//   }
// }
// catch (error) {
// console.log("error on displaying the qr", error);
// res.render("error", { message: error?.message, error: error });
// }