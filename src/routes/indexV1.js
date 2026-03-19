
import {Router} from 'express';
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
} from '../controllers/index.controller.js';

import { authValidator } from '../helpers/index.helper.js';

const router = Router();


router.post('/webhook', accountWebhook); //ok tested 
router.post('/msg/webhook',msgWebhook);  //ok tested 

router.get('/qr',authValidator ,validateQRRequest, getQr);

router.get('/checkSession',authValidator, checkSession); //ok tested 
router.post("/checkOrgUserStatus",authValidator, checkOrgUserStatus); //ok tested 

router.get("/activategroup",authValidator, groupActivate);



router.get("/updateNumAvailability",authValidator, updateCheckNumber); //ok tested 

//one to one message apis
router.post('/sendMessage',authValidator, validateRequest, sendMsgFunc);
router.post("/deleteMessage",authValidator,validateRequest, deleteMsgToWhatsapp); 

//group apis
router.post('/createGroup',authValidator, validateRequest, createGroup); 
router.post('/add/Remove/Participant',authValidator, validateRequest, addRemoveParticipants);//done
router.post("/sendGroupMessage",authValidator,validateRequest, sendMsgFunc); 
router.get("/activategroup", groupActivate); //ok tested 

//history sync apis
// router.get("/syncHistory",authValidator, validateRequest, syncMessageHistoryList);

export default router;
