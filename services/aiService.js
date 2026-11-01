import dotenv from 'dotenv';
dotenv.config();

import { GoogleGenerativeAI } from '@google/generative-ai';
import { KNOWLEDGE_BASE_TEXT } from '../config/knowledgeBase.js';

const SYSTEM_INSTRUCTION = `
You are the AI Assistant for Verdant & Co, a premium vegan skincare brand in India.
Your task is to draft a suggested reply to a customer message for our human support agents.

STRICT SOURCE OF TRUTH (Knowledge Base Policies):
${KNOWLEDGE_BASE_TEXT}

RULES & TONE:
1. Short, polite, helpful, and natural (WhatsApp/chat tone). An agent should be able to send it with little or no editing.
2. DO NOT make up policies or promise things not covered in the Knowledge Base.
3. Specific Edge Cases:
   - International delivery (e.g. Dubai): We only deliver within India (metro: 3-5 days, non-metro: 5-8 days). Politely clarify that international shipping is not supported.
   - Address change: Only permitted before the order has shipped AND within 12 hours of placing the order.
   - Cash on delivery: Only available for orders under ₹3,000 with a ₹50 fee. (If order is ₹3,000 or above, explain it cannot be COD).
   - Medical / Allergies: Empathize, advise them to stop using the product immediately and seek medical advice if needed, and offer to help with a return or refund according to our policy. Never give medical prescriptions.
4. Output format: Output ONLY the suggested reply text. Do NOT add greetings like "Here is a draft:" or placeholders like "[Agent Name]".
`;

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenerativeAI(apiKey);
};

const withTimeout = (promise, ms = 45000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`AI service timed out after ${ms}ms`)), ms)
    )
  ]);
};

export const generateDraftReply = async (customerName, customerMessageText, conversationHistory = []) => {
  const fallback = generateFallbackReply(customerMessageText);

  try {
    const genAI = getGenAI();
    if (!genAI) {
      console.log('[AI Service] No Gemini API key found. Using Knowledge Base fallback response.');
      return {
        success: true,
        draftText: fallback,
        error: null
      };
    }

    const contextMessages = conversationHistory
      .slice(-6)
      .map((m) => `${m.senderType === 'customer' ? 'Customer' : 'Agent'}: ${m.text}`)
      .join('\n');

    const prompt = `Customer Name: ${customerName || 'Customer'}
Recent Conversation:
${contextMessages || 'No prior messages.'}

New Customer Message:
"${customerMessageText}"

Draft a short, accurate, polite reply based on Verdant & Co policies:`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-lite-latest',
      systemInstruction: SYSTEM_INSTRUCTION
    });

    const result = await withTimeout(model.generateContent(prompt), 45000);
    const response = await result.response;
    const replyText = response.text()?.trim();

    return {
      success: true,
      draftText: replyText || fallback,
      error: null
    };
  } catch (error) {
    console.warn('[AI Service Warning]:', error.message, '- Using grounded policy fallback.');
    return {
      success: true,
      draftText: fallback,
      error: error.message
    };
  }
};

/**
 * Deterministic rule-based fallback in case LLM API quota/key is unavailable
 */
export function generateFallbackReply(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('address') || lower.includes('order #')) {
    return "Hi! We can update your delivery address if your order hasn't shipped yet and was placed within the last 12 hours. Could you please share when your order was placed so we can check for you?";
  }
  if (lower.includes('return') || lower.includes('policy')) {
    return "Hi! We accept returns within 7 days of delivery for unopened, unused products. Opened products are accepted only if damaged or if the wrong item was sent. Once returned, refunds are processed within 5-7 business days.";
  }
  if (lower.includes('dubai') || lower.includes('international') || lower.includes('outside india')) {
    return "Hi! Currently, Verdant & Co only delivers within India (3-5 business days in metro cities, 5-8 business days elsewhere). We unfortunately do not offer international shipping to Dubai at this time.";
  }
  if (lower.includes('cash on delivery') || lower.includes('cod')) {
    return "Hi! Cash on delivery is available exclusively for orders under ₹3,000, with a ₹50 fee. For orders of ₹3,000 or above, online payment is required.";
  }
  if (lower.includes('allergic') || lower.includes('reaction') || lower.includes('rash') || lower.includes('serum')) {
    return "Hi, we are so sorry to hear that. Please stop using the product immediately, and consult a doctor if the irritation persists. All our products are vegan and fragrance-free, but individual reactions can occur. We'd be glad to help process a return for you.";
  }
  return "Hi! Thank you for reaching out to Verdant & Co. How can we help you with your order today?";
}
