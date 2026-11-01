import { Customer } from '../models/Customer.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { AIDraft } from '../models/AIDraft.js';
import { generateDraftReply } from './aiService.js';

export const processIncomingMessage = async (payload) => {
  const { event_id, brand_id, timestamp, customer, message } = payload;

  if (!customer?.id || !message?.id || !message?.text) {
    throw new Error('Invalid payload: customer.id, message.id, and message.text are required');
  }

  // 1. Upsert Customer
  const customerDoc = await Customer.findOneAndUpdate(
    { customerId: customer.id },
    {
      customerId: customer.id,
      name: customer.name || 'Anonymous Customer',
      phone: customer.phone || 'N/A'
    },
    { upsert: true, new: true }
  );

  // 2. Find or create the single open conversation for this customer
  let conversation = await Conversation.findOne({
    customerId: customer.id,
    status: 'open'
  });

  if (!conversation) {
    conversation = await Conversation.create({
      customerId: customer.id,
      brandId: brand_id || 'verdant-co',
      status: 'open',
      lastMessageAt: timestamp ? new Date(timestamp) : new Date(),
      lastMessageText: message.text,
      lastSenderType: 'customer'
    });
  }

  // 3. Save Message (Idempotent check)
  let savedMessage = await Message.findOne({ messageId: message.id });
  if (!savedMessage) {
    savedMessage = await Message.create({
      messageId: message.id,
      conversationId: conversation._id,
      senderType: 'customer',
      text: message.text,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
  }

  // 4. Update conversation latest activity
  conversation.lastMessageAt = savedMessage.timestamp;
  conversation.lastMessageText = savedMessage.text;
  conversation.lastSenderType = 'customer';
  await conversation.save();

  // 5. Fetch past messages for conversational context
  const messageHistory = await Message.find({ conversationId: conversation._id })
    .sort({ timestamp: 1 })
    .limit(10)
    .lean();

  // Mark any old pending suggested drafts as superseded
  await AIDraft.updateMany(
    { conversationId: conversation._id, status: 'suggested' },
    { status: 'superseded' }
  );

  // 6. Generate AI Draft for this new customer message
  let draftDoc = await AIDraft.findOne({ messageId: message.id });
  if (!draftDoc) {
    const aiResult = await generateDraftReply(
      customer.name,
      message.text,
      messageHistory
    );

    draftDoc = await AIDraft.create({
      messageId: message.id,
      conversationId: conversation._id,
      draftText: aiResult.draftText,
      status: aiResult.success ? 'suggested' : 'failed',
      failureReason: aiResult.error
    });
  }

  return {
    conversationId: conversation._id,
    customerId: customer.id,
    messageId: savedMessage.messageId,
    draft: draftDoc
  };
};
