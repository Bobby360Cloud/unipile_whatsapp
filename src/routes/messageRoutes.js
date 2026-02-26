import express from 'express';
import {msgWebhook , sendMsgToWhatsapp} from '../controllers/messageController.js';

const router = express.Router();



router.post('/webhook', msgWebhook); 
router.post('/sendMessage',sendMsgToWhatsapp);

export default router;