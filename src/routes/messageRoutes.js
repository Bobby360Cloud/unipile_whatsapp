import express from 'express';
import {webhook , sendMsgToWhatsapp} from '../controllers/messageController.js';

const router = express.Router();



router.post('/webhook', webhook); 
router.post('/sendMessage',sendMsgToWhatsapp);

export default router;