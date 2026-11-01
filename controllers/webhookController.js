import { processIncomingMessage } from '../services/webhookService.js';

export const handleWebhook = async (req, res) => {
  try {
    const result = await processIncomingMessage(req.body);
    return res.status(200).json({
      status: 'success',
      message: 'Message processed and AI draft created',
      data: result
    });
  } catch (error) {
    console.error('[Webhook Controller Error]:', error);
    return res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
};
