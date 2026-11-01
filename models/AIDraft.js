import mongoose from 'mongoose';

const aiDraftSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: true,
      index: true
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true
    },
    draftText: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['suggested', 'approved', 'edited', 'failed'],
      default: 'suggested'
    },
    approvedText: {
      type: String,
      default: null
    },
    failureReason: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

export const AIDraft = mongoose.model('AIDraft', aiDraftSchema);
