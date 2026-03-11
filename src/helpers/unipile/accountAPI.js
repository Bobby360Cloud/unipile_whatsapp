
import config from '../../config';
import { UnipileClient } from 'unipile-node-sdk';
const client = new UnipileClient(`https://${config.UNIPILE_DSN}`, `${config.UNIPILE_API_KEY}`);
export const getAllAttendees=async(account_id)=>{
const attendies = await client.messaging.getAllAttendees({
        account_id: account_id
      });
      return attendies;
}

