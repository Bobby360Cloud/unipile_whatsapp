import express from 'express';

const router = express.Router();

router.get('/qr', getQr);

export default router;