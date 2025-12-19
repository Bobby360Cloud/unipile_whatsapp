import { UnipileClient } from 'unipile-node-sdk';
import config from '../configs/config';
export async function webhook(req, res) {
    console.log("Webhook received: for messages ");
    console.log("Full request body: ", JSON.stringify(req.body, null, 2));
    if (req.body  && req?.body?.account_type === 'WHATSAPP') {

      // Handle different account statuses as needed
      
  }
    res.status(200).send('Webhook received');
  }


  export async function sendMsgToWhatsapp (req, res) {
    try {
      const client = new UnipileClient(`https://${config.unipile_dsn}`, `${config.unipile_api_key}`);
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