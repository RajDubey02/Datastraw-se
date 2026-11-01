import express from 'express';
import { agentLogin } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', agentLogin);

export default router;
