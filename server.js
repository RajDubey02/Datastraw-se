import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import webhookRoutes from './routes/webhookRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// CORS middleware
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Signature']
  })
);

// Capture raw body for exact HMAC-SHA256 signature verification
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })
);

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    brand: 'Verdant & Co Support API',
    status: 'healthy',
    time: new Date().toISOString()
  });
});

// Webhook endpoint (both /webhook and /api/webhook supported as required by assessment)
app.use('/webhook', webhookRoutes);
app.use('/api/webhook', webhookRoutes);

// Conversations & Customer APIs
app.use('/api/conversations', conversationRoutes);

// Auth APIs
app.use('/api/auth', authRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` Verdant & Co AI Backend running on port ${PORT}`);
  console.log(` Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(` Health Check: http://localhost:${PORT}/`);
  console.log(`===============================================`);
});
