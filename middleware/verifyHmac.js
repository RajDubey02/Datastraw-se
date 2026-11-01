import crypto from 'crypto';

export const verifyHmac = (req, res, next) => {
  const signatureHeader = req.headers['x-signature'];
  const secret = process.env.WEBHOOK_SECRET || 'verdant-demo-secret-2026';

  if (!signatureHeader) {
    return res.status(401).json({
      error: 'Missing X-Signature header',
      expectedFormat: 'X-Signature: sha256=<hex>'
    });
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'sha256') {
    return res.status(401).json({
      error: 'Invalid X-Signature header format',
      expectedFormat: 'X-Signature: sha256=<hex>'
    });
  }

  const receivedHash = parts[1].trim();

  // Use rawBody buffer captured during express body parsing
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body));
  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const receivedBuffer = Buffer.from(receivedHash, 'hex');
  const expectedBuffer = Buffer.from(expectedHash, 'hex');

  if (
    receivedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({
      error: 'HMAC signature verification failed',
      message: 'The signature does not match the secret key.'
    });
  }

  next();
};
