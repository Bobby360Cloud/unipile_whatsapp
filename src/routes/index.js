import express from 'express';
import {
  getQr,
  validateQRRequest,
  accountWebhook,
  validateRequest,
  checkSession,
  checkOrgUserStatus,
  deleteMsgToWhatsapp,
  msgWebhook,
  sendMsgFunc,
  createGroup,
  groupActivate,
  addRemoveParticipants,
  updateCheckNumber,
  sendEditMsgToWhatsapp
} from '../controllers/index.controller.js';

const router = express.Router();



router.get('/qr',validateQRRequest, getQr);
router.post('/webhook', accountWebhook); //ok tested 
router.post('/msg/webhook', msgWebhook);  //ok tested 


router.get('/checkSession', checkSession); 
router.post("/checkOrgUserStatus", checkOrgUserStatus);

router.get("/updateNumAvailability", updateCheckNumber); //ok tested 

router.post('/sendMessage', validateRequest, sendMsgFunc);
router.delete("/deleteMessage",validateRequest, deleteMsgToWhatsapp); 

router.post("/editMessage", validateRequest, sendEditMsgToWhatsapp); 

//group apis
router.post('/createGroup', validateRequest, createGroup); 
router.post('/add/Remove/Participant', validateRequest, addRemoveParticipants);
router.post("/sendGroupMessage",validateRequest, sendMsgFunc); 
router.get("/activategroup", groupActivate); 

//history sync apis
// router.get("/syncHistory", validateRequest, syncMessageHistoryList);


export default router;