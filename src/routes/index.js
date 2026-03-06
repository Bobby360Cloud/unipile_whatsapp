import express from 'express';
import { getQr , validateQRRequest, webhook, validateRequest, checkSession, checkOrgUserStatus} from '../controllers/authController.js';


import {deleteMsgToWhatsapp, msgWebhook , sendMsgToWhatsapp} from '../controllers/messageController.js';
import { groupActivate } from '../controllers/groupController.js';

const router = express.Router();



router.get('/qr',validateQRRequest, getQr);
router.post('/webhook', webhook); //ok tested 
router.post('/msg/webhook', msgWebhook);  //ok tested 


router.get('/checkSession', checkSession); 
router.post("/checkOrgUserStatus", checkOrgUserStatus);

// router.get("/updateNumAvailability", updateCheckNumber); //ok tested 

router.post('/sendMessage', validateRequest, sendMsgToWhatsapp);
// router.post("/editMessage", validateRequest, sendEditMsgToWhatsapp); 
router.post("/deleteMessage",validateRequest, deleteMsgToWhatsapp); 

//group apis
// router.post('/createGroup', validateRequest, createGroup); 
// router.post('/add/Remove/Participant', validateRequest, addRemoveParticipants);
// router.post("/sendGroupMessage",validateRequest, sendMessage); 
router.get("/activategroup", groupActivate); 

//history sync apis
// router.get("/syncHistory", validateRequest, syncMessageHistoryList);


export default router;