import express from 'express';
import {msgWebhook , sendMsgToWhatsapp} from '../controllers/messageController.js';

const router = express.Router();



router.post('/webhook', msgWebhook); 

router.post('/sendMessage', validateRequest, sendMessage);
router.post("/editMessage", validateRequest, sendEditMsgToWhatsapp); 
router.post("/deleteMessage",validateRequest, deleteMsgToWhatsapp);

export default router;