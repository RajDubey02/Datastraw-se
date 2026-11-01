import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      ref: 'Customer',
      required: true,
      index: true
    },
    brandId: {
      type: String,
      default: 'verdant-co'
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open'
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    lastMessageText: {
      type: String,
      default: ''
    },
    lastSenderType: {
      type: String,
      enum: ['customer', 'agent'],
      default: 'customer'
    }
  },
  { timestamps: true }
);

export const Conversation = mongoose.model('Conversation', conversationSchema);
