import { Customer } from '../models/Customer.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { AIDraft } from '../models/AIDraft.js';
import { processIncomingMessage } from '../services/webhookService.js';

// GET /api/conversations (Agent View - List all conversations)
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find()
      .sort({ lastMessageAt: -1 })
      .lean();

    // Attach customer details to each conversation
    const customerIds = conversations.map((c) => c.customerId);
    const customers = await Customer.find({ customerId: { $in: customerIds } }).lean();
    const customerMap = new Map(customers.map((c) => [c.customerId, c]));

    // Attach pending draft indicator (only true if the latest message is from a customer)
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        let hasPendingDraft = false;
        if (conv.lastSenderType === 'customer') {
          const draft = await AIDraft.findOne({
            conversationId: conv._id,
            status: 'suggested'
          });
          hasPendingDraft = !!draft;
        }

        return {
          ...conv,
          customer: customerMap.get(conv.customerId) || {
            customerId: conv.customerId,
            name: 'Unknown Customer',
            phone: 'N/A'
          },
          hasPendingDraft
        };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/conversations/:id (Agent View - Conversation detail with messages & draft)
export const getConversationById = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id).lean();
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const customer = await Customer.findOne({ customerId: conversation.customerId }).lean();
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ timestamp: 1 })
      .lean();

    // Active draft should only exist if the latest message is an unanswered customer message
    let activeDraft = null;
    const lastMsg = messages[messages.length - 1];

    if (lastMsg && lastMsg.senderType === 'customer') {
      activeDraft = await AIDraft.findOne({
        conversationId: conversation._id,
        messageId: lastMsg.messageId,
        status: 'suggested'
      });
      // Fallback: if not found by messageId, find latest suggested
      if (!activeDraft) {
        activeDraft = await AIDraft.findOne({
          conversationId: conversation._id,
          status: 'suggested'
        }).sort({ createdAt: -1 });
      }
    }

    res.json({
      success: true,
      data: {
        conversation,
        customer,
        messages,
        activeDraft
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/conversations/customer/:customerId (Customer View - sees only conversation and approved replies, NO DRAFTS)
export const getCustomerConversation = async (req, res) => {
  try {
    const { customerId } = req.params;
    let customer = await Customer.findOne({ customerId }).lean();
    let conversation = await Conversation.findOne({ customerId, status: 'open' }).lean();

    if (!conversation) {
      return res.json({
        success: true,
        data: {
          customer,
          conversation: null,
          messages: []
        }
      });
    }

    // Customer only sees messages, NEVER AI drafts!
    const messages = await Message.find({ conversationId: conversation._id })
      .sort({ timestamp: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        customer,
        conversation,
        messages
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/conversations/:id/approve (Agent approves draft)
export const approveDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedText, draftId } = req.body;

    if (!approvedText || !approvedText.trim()) {
      return res.status(400).json({ success: false, error: 'Reply text cannot be empty' });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // 1. Create Agent Message
    const agentMsgId = `msg_agent_${Date.now()}`;
    const agentMessage = await Message.create({
      messageId: agentMsgId,
      conversationId: conversation._id,
      senderType: 'agent',
      text: approvedText.trim(),
      timestamp: new Date()
    });

    // 2. Mark AI Draft as approved
    if (draftId) {
      await AIDraft.findByIdAndUpdate(draftId, {
        status: 'approved',
        approvedText: approvedText.trim()
      });
    }
    // Also mark any remaining suggested drafts for this conversation as approved
    await AIDraft.updateMany(
      { conversationId: conversation._id, status: 'suggested' },
      { status: 'approved', approvedText: approvedText.trim() }
    );

    // 3. Update Conversation status & last message
    conversation.lastMessageAt = agentMessage.timestamp;
    conversation.lastMessageText = agentMessage.text;
    conversation.lastSenderType = 'agent';
    await conversation.save();

    res.json({
      success: true,
      message: 'Reply approved and saved to conversation',
      data: agentMessage
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// POST /api/customer/message (Customer View sends message)
export const sendCustomerMessage = async (req, res) => {
  try {
    const { customerId, customerName, customerPhone, text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Message text cannot be empty' });
    }

    const payload = {
      event_id: `evt_${Date.now()}`,
      type: 'message.received',
      brand_id: 'verdant-co',
      timestamp: new Date().toISOString(),
      customer: {
        id: customerId || 'cust_demo',
        name: customerName || 'Valued Customer',
        phone: customerPhone || '+919800000000'
      },
      message: {
        id: `msg_${Date.now()}`,
        type: 'text',
        text: text.trim()
      }
    };

    // Exactly the same logic as the webhook!
    const result = await processIncomingMessage(payload);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /api/customers (Get list of test customers)
export const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
