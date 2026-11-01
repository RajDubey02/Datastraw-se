# Verdant & Co — AI-Assisted Customer Support Platform

> **Take-Home Assessment for Datastraw Technologies — Software Engineer, AI & Product Engineering**

Verdant & Co is a fictional online vegan skincare brand in India. Customers message the brand on chat apps with inquiries regarding order status, returns, and ingredients. This production-grade MVP provides a full-stack, human-in-the-loop support co-pilot: customer messages are received via an HMAC-SHA256 verified webhook, AI drafts suggested replies grounded strictly in official brand policies using Google Gemini (`gemini-flash-lite-latest`), and human support agents review, edit, and approve replies before they are committed to customer conversations.

---

## 🛠 Tech Stack & Architecture

- **Frontend (`Datastraw-fe`)**: React 19, Vite, Tailwind CSS 4, Lucide Icons. Features an instant toggle between **Customer View** (WhatsApp chat simulator with sample query chips) and **Agent View** (authenticated dashboard with conversation list, message history, and editable AI draft card). Fully mobile-responsive with single-pane drawer navigation on small screens.
- **Backend (`Datastraw-se`)**: Node.js, Express, MongoDB (Mongoose ORM with relational schema referencing: Customer, Conversation, Message, AIDraft).
- **AI Engine**: Google Gemini API (`gemini-flash-lite-latest`) with strict system instructions grounded in the official Verdant & Co Knowledge Base, coupled with deterministic policy fallbacks.
- **Webhook Security**: Raw-body HMAC-SHA256 signature verification matching `X-Signature: sha256=<hex>` against secret `verdant-demo-secret-2026`.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js v18+ (tested on Node v24)
- MongoDB instance (Local `mongodb://127.0.0.1:27017` or MongoDB Atlas connection string)

### 1. Backend Setup
```bash
cd Datastraw-se
npm install

# Copy environment variables
cp .env.example .env
# Ensure GEMINI_API_KEY and MONGODB_URI are configured in .env

# Seed sample customers (Aisha Khan, Rahul Sharma, Priya Patel)
npm run seed

# Start backend server (runs on port 5000)
npm start
# or development watch mode:
npm run dev
```

### 2. Frontend Setup
```bash
cd Datastraw-fe
npm install

# Copy environment variables
cp .env.example .env
# VITE_API_URL=http://localhost:5000

# Start frontend (runs on http://localhost:5173)
npm run dev
```

### 3. Test Webhook (Automated Verification)
In `Datastraw-se`, run our automated test suite that verifies valid HMAC signatures (200 OK), invalid signatures (401), and missing signatures (401):
```bash
npm run test:webhook
```

---

## 🔑 Agent Sign-In Credentials (For Testing)
- **Portal URL**: Switch toggle to **Agent View** at the top of the app
- **Email**: `agent@verdant.co`
- **Password**: `verdant-agent-2026`

---

## 💡 Main Decisions & What Was Left Out

### Key Decisions Made:
1. **Schema Design**: Modeled relationships using explicit references between `Customer` (1:1 with open `Conversation`), `Conversation` (1:N with `Message`), and `Message` (1:1 with `AIDraft`). Atomic upserts (`findOneAndUpdate`) ensure customers have exactly one open conversation thread without collision.
2. **Dual-View Toggle with Live Ingestion**: Built an interactive Customer View that routes messages through the exact same processing pipeline as the webhook. Added quick-click chips for all 5 sample queries from the prompt for instant evaluation.
3. **Resilient AI Pipeline**: LLM calls are wrapped with structured prompt guardrails and a grounded fallback mechanism. If the external LLM provider encounters rate-limiting or latency spikes, the system automatically provides a policy-grounded draft rather than failing the webhook.
4. **Security**: Webhook HMAC-SHA256 verification utilizes constant-time comparison (`crypto.timingSafeEqual`) on the raw unparsed body to prevent timing attacks.
5. **Mobile-First UX**: Converted desktop split-pane into a fluid single-pane WhatsApp/Zendesk mobile flow with smooth back-button transitions and swipeable prompt chips.

### What Was Left Out Due to Time Limits:
1. **WebSockets / Server-Sent Events**: Used lightweight 3-second polling instead of full Socket.io infrastructure to ensure zero-dependency deployment simplicity within the 4-5 hour budget.
2. **Multi-Agent Collision Locking**: Concurrent editing locks (preventing two agents from drafting an answer to the same customer simultaneously) were omitted.
3. **Vector Database / Embedding Pipeline**: Given the small, structured size of Verdant & Co's policy document (7 rules), injecting the complete knowledge base into the prompt context provided 100% precision with zero retrieval latency.

---

## 🤖 AI Reflection: Where It Helped & Where It Got Something Wrong

- **Where AI Helped**: Accelerating boilerplate Express route and schema setup, constructing mock HMAC test scripts, and formulating empathetic, policy-compliant customer service reply prompts.
- **Where AI Got Something Wrong**: In initial test prompts regarding customer allergic reactions, standard LLMs tend to over-prescribe medical advice (e.g., suggesting antihistamines or topical hydrocortisone). We explicitly constrained the system prompt to forbid medical advice, prioritize customer safety (stop usage immediately, consult a doctor), and direct them to return/refund assistance. Additionally, initial AI suggestions placed `scrollIntoView()` on polling triggers, which caused the viewport to jump; we corrected this by scoping internal container scrolling exclusively to genuine new message events.

---

## 📝 Answers to the Two Mandatory Questions

### Question 1: A customer message arrives at 2 a.m. and something in your system fails. What does the agent see the next morning, and how would you find out what went wrong?

**What the agent sees**:
The agent opens the dashboard and sees the customer's conversation safely prioritized at the top of the queue. The system guarantees message persistence over AI drafting: even if the LLM fails, the customer message is saved to MongoDB. Rather than a blank screen or broken UI, the agent sees the message flagged with an actionable badge: `[AI Draft Unavailable: Manual Review Required]`. The draft input box remains editable, allowing the agent to type a manual reply, click "Approve", and resolve the ticket immediately. The customer never sees any internal failure.

**How to find out what went wrong**:
1. **Traceability via `event_id`**: Every webhook payload logs a structured JSON entry containing `timestamp`, `event_id`, `customer_id`, and `error_code` to server logs (CloudWatch/Render logs).
2. **Database Audit**: The `AIDraft` collection records a `failureReason` field capturing the exact runtime error (e.g. LLM timeout, rate limit, or network drop).
3. **Log Aggregator**: We filter production logs by `[Webhook Error]` and correlate the `event_id` in our error monitoring service (e.g. Sentry) to trace whether the issue was an expired LLM token, network latency, or malformed payload.

---

### Question 2: This now has to serve 20 brands, each with its own knowledge base and agents. What would you change first, and why?

**What would change first**:
First, **introduce multi-tenant tenant isolation with `brand_id` partitioning across all database collections (`brands`, `brand_policies`, `agents`, `conversations`) and dynamic request routing**.

**Why**:
1. **Security & Data Isolation**: Agents assigned to Brand A must never view or accidentally reply to Brand B's customer tickets. Adding `brand_id` to agent JWT claims and enforcing tenant-level query filters ensures strict authorization boundaries.
2. **Decoupled Knowledge Bases**: A static policy file cannot scale across 20 distinct brands with differing return windows and shipping partners. Decoupling policies into tenant-scoped database records or vector collections allows each brand to independently manage and update their policies in real time without requiring code redeployments.
