import express from 'express';
import {
  getConversations,
  getConversationById,
  getCustomerConversation,
  approveDraft,
  sendCustomerMessage,
  getCustomers
} from '../controllers/conversationController.js';

const router = express.Router();

router.get('/', getConversations);
router.get('/customers/all', getCustomers);
router.get('/customer/:customerId', getCustomerConversation);
router.get('/:id', getConversationById);
router.post('/:id/approve', approveDraft);
router.post('/customer/message', sendCustomerMessage);

export default router;
