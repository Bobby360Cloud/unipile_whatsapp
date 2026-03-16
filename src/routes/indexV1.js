
import {Router} from 'express';
import { getQr , validateQRRequest, webhook, validateRequest, checkSession, checkOrgUserStatus} from '../controllers/authController.js';


import {deleteMsgToWhatsapp, msgWebhook , sendMsgFunc} from '../controllers/messageController.js';
import { createGroup, groupActivate, addRemoveParticipants } from '../controllers/groupController.js';
import { authValidator } from '../helpers/validator.js';
import { updateCheckNumber } from '../controllers/index.js';

const router = Router();


router.post('/webhook', webhook); //ok tested 
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
