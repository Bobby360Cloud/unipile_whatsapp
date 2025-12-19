import express from 'express';
import { getQr , webhook} from '../controllers/authController.js';

const router = express.Router();

router.get('/qr', getQr);

router.post('/account/webhook', webhook); 

export default router;