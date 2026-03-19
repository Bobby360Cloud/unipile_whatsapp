
import { manageUnipileLogin, manageUnipileLogout, oneToOneMessageParser, groupMessageParser, editMessageParser, deliveryParser } from '../helpers/index.helper.js';

export async function accountWebhook(req, res) {
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


export async function msgWebhook(req, res) {
  const message = req?.body;
  console.log("Message Webhook received:", message);
  if (message.account_type !== 'WHATSAPP') return res.status(200).send('Webhook received');
  if (message && message.account_type === 'WHATSAPP' && message.is_group === false && message?.event === 'message_received') {
    console.log("Webhook received: for one to one messages ", message?.account_id, message?.message_id);
    console.log("Full request body: for edit messages ", JSON.stringify(req.body, null, 2));
    await oneToOneMessageParser(message);
  } else if (message && message.account_type === 'WHATSAPP' && message.is_group === true && message?.event === 'message_received') {
    console.log("Webhook received: for group messages ", message?.account_id, message?.message_id);
    console.log("Full request body: for edit messages ", JSON.stringify(req.body, null, 2));
    await groupMessageParser(message);
  } else if (message && message.account_type === 'WHATSAPP' && message?.event === 'message_edited') {
    console.log("Webhook received: for edit messages ", message?.account_id, message?.message_id);
    console.log("Full request body: for edit messages ", JSON.stringify(req.body, null, 2));
    await editMessageParser(message);
  } else if (message && message.account_type === 'WHATSAPP' && (message?.event === 'message_read' || message?.event === 'message_delivered')) {
    console.log("Webhook received: for read messages ", message?.account_id, message?.message_id);
    console.log("Full request body: for deliivery ", JSON.stringify(req.body, null, 2));
    await deliveryParser(message);

  } else if (message && message.account_type === 'WHATSAPP' && message?.event === 'message_deleted') {
    console.log("Webhook received: for delete msg", message?.account_id, message?.message_id);
    // console.log("Full request body: for delete msg", JSON.stringify(req.body, null, 2));
  }
  else if (message && message.account_type === 'WHATSAPP') {
    console.log("Webhook received: for other messages ", message?.account_id, message?.message_id);
    // console.log("Full request body: for other messages ", JSON.stringify(req.body, null, 2));
  }
  res.status(200).send('Webhook received');
}