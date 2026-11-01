import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { AIDraft } from '../models/AIDraft.js';

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/verdant_support');
    console.log('[Seed] Connected to MongoDB...');

    // Clean existing seed data
    await Customer.deleteMany({});
    await Conversation.deleteMany({});
    await Message.deleteMany({});
    await AIDraft.deleteMany({});

    console.log('[Seed] Collections cleared.');

    const customers = [
      {
        customerId: 'cust_1042',
        name: 'Aisha Khan',
        phone: '+919800000001'
      },
      {
        customerId: 'cust_1043',
        name: 'Rahul Sharma',
        phone: '+919800000002'
      },
      {
        customerId: 'cust_1044',
        name: 'Priya Patel',
        phone: '+919800000003'
      }
    ];

    await Customer.insertMany(customers);
    console.log('[Seed] Sample customers seeded:', customers.map((c) => c.name));

    // Create an initial open conversation for Aisha Khan as described in the PDF example
    const conv = await Conversation.create({
      customerId: 'cust_1042',
      brandId: 'verdant-co',
      status: 'open',
      lastMessageAt: new Date(),
      lastMessageText: "Hi, my order #4471 hasn't arrived yet. Can I change the delivery address?",
      lastSenderType: 'customer'
    });

    const msg = await Message.create({
      messageId: 'msg_88213',
      conversationId: conv._id,
      senderType: 'customer',
      text: "Hi, my order #4471 hasn't arrived yet. Can I change the delivery address?",
      timestamp: new Date()
    });

    await AIDraft.create({
      messageId: 'msg_88213',
      conversationId: conv._id,
      draftText: "Hi Aisha! Thanks for reaching out. We can change your delivery address if your order hasn't shipped yet and was placed within the last 12 hours. Could you please confirm when your order was placed so we can verify if it's eligible?",
      status: 'suggested'
    });

    console.log('[Seed] Initial conversation & AI draft created for Aisha Khan.');
    console.log('[Seed] Database ready.');
    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error);
    process.exit(1);
  }
};

seedData();
