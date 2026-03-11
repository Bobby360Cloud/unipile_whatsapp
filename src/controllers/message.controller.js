import checkNumbersModel from "../models/checkNumbers.model";

export async function sendMessage (req, res) {
    try {
     const { sessionId } = req.body;
    let number = req?.body?.tonumber;
    let groupId = req?.body?.groupId;
    const message = req?.body?.message;
    const file = req?.body?.fileurl;
    let response;

    let numberDetails = await checkNumbersModel.findOneAndUpdate({ sessionId: sessionId }, { $set: { isAvailable: true,number: number } }, { upsert: true, new: true });
  
  
     
      
      return response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }


  async function sendWhatsAppMessage(account_id, recipient_number, message_text) {
  const form = new FormData();
  form.append('account_id', account_id);
  form.append('attendees_ids', recipient_number);
  form.append('text', message_text);
  try {
    const response = await axios.post(
      `https://${YOUR_DSN}/api/v1/chats`,
      form,
      {
        headers: {
          'X-API-KEY': YOUR_ACCESS_TOKEN,
          ...form.getHeaders(),
        },
      }
    );

    console.log('Message sent successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error('Error:', error.response.status, error.response.data);
    } else {
      console.error('Request failed:', error.message);
    }
  }
}