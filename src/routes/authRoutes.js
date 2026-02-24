import express from 'express';
import { getQr , validateQRRequest, webhook} from '../controllers/authController.js';

const router = express.Router();

router.get('/qr',validateQRRequest, getQr);

router.post('/webhook', webhook); 

export default router;