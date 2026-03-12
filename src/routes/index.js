import express from 'express';
import { getQr , validateQRRequest, webhook, validateRequest, checkSession, checkOrgUserStatus} from '../controllers/authController.js';


import {deleteMsgToWhatsapp, msgWebhook , sendMsgFunc} from '../controllers/messageController.js';
import { createGroup, groupActivate } from '../controllers/groupController.js';

const router = express.Router();



router.get('/qr',validateQRRequest, getQr);
router.post('/webhook', webhook); //ok tested 
router.post('/msg/webhook', msgWebhook);  //ok tested 


router.get('/checkSession', checkSession); 
router.post("/checkOrgUserStatus", checkOrgUserStatus);

//router.get("/updateNumAvailability", updateCheckNumber); //ok tested 

router.post('/sendMessage', validateRequest, sendMsgFunc);
// router.post("/editMessage", validateRequest, sendEditMsgToWhatsapp);  
router.delete("/deleteMessage",validateRequest, deleteMsgToWhatsapp); 

//group apis
router.post('/createGroup', validateRequest, createGroup); 
// router.post('/add/Remove/Participant', validateRequest, addRemoveParticipants);
router.post("/sendGroupMessage",validateRequest, sendMsgFunc); 
router.get("/activategroup", groupActivate); 

//history sync apis
// router.get("/syncHistory", validateRequest, syncMessageHistoryList);


export default router;