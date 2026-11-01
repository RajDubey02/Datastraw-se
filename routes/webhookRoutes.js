import express from 'express';
import { handleWebhook } from '../controllers/webhookController.js';
import { verifyHmac } from '../middleware/verifyHmac.js';

const router = express.Router();

// As required: POST /webhook (and /api/webhook) accepts HMAC-signed payload
router.post('/', verifyHmac, handleWebhook);

export default router;
