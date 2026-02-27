import { UnipileClient } from 'unipile-node-sdk';
import config from '../configs/config';
import { editMessageParser, groupMessageParser, oneToOneMessageParser } from '../helpers/messageParser';
export async function msgWebhook(req, res) {
    const message = req?.body ;
    if (message && message.account_type === 'WHATSAPP' && message.is_group === false && message?.event ==='message_received') {

      console.log("Webhook received: for one to one messages ");
      // console.log("Full request body: for one to one messages ", JSON.stringify(req.body, null, 2));
    await oneToOneMessageParser(message); 
  }else if (message && message.account_type === 'WHATSAPP' && message.is_group === true && message?.event ==='message_received') {

    console.log("Webhook received: for group messages ");
    // console.log("Full request body: for group messages ", JSON.stringify(req.body, null, 2));
    await groupMessageParser(message);
   }else if ( message && message.account_type === 'WHATSAPP' && message?.event ==='message_edited' ){
    await editMessageParser(message);
   }else if (message && message.account_type === 'WHATSAPP' && message?.event ==='message_read' ){
    // handle  read status
   }else if (message && message.account_type === 'WHATSAPP' && message?.event ==='message_delivered' ){
    //handle message delivery
   }else if (message && message.account_type === 'WHATSAPP' && message?.event ==='message_deleted' ){
    //handle delete message event
   }
   else if (message && message.account_type === 'WHATSAPP' ){
    console.log("Webhook received: for other messages ");
    console.log("Full request body: for other messages ", JSON.stringify(req.body, null, 2));
   }
    res.status(200).send('Webhook received');
  }

  const client = new UnipileClient(`https://${config.UNIPILE_DSN}`, `${config.UNIPILE_API_KEY}`);
  export async function sendMsgToWhatsapp (req, res) {
    try {

      const response = await client.messaging.sendMessage({
        chat_id: "0q9seaUUXKWT0oQWrY__zg",
        text: "kya krre ho"
      })
  
  
      console.log('Message sent successfully:', response);

      const attendies = await client.messaging.getAllAttendees({
        account_id: 'VaoRI8d7SbGNE_tmJzsy1w',
      });
      // if(attendies?.items && attendies.items.length > 0) {
      //   attendies.items.forEach(attendee => {
      //     console.log(`Attendee item ${attendee} and specific ${attendee?.specifics}` );
      //   });
      // }

      console.log("attendies==================", JSON.stringify(attendies));
      
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }