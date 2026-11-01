import crypto from 'crypto';

const TARGET_URL = process.env.TEST_URL || 'http://localhost:5000/webhook';
const SECRET = process.env.WEBHOOK_SECRET || 'verdant-demo-secret-2026';

const samplePayload = {
  event_id: `evt_${Date.now()}`,
  type: 'message.received',
  brand_id: 'verdant-co',
  timestamp: new Date().toISOString(),
  customer: {
    id: 'cust_1042',
    name: 'Aisha Khan',
    phone: '+919800000001'
  },
  message: {
    id: `msg_${Date.now()}`,
    type: 'text',
    text: "Hi, my order #4471 hasn't arrived yet. Can I change the delivery address?"
  }
};

async function runTests() {
  console.log(`\n========================================`);
  console.log(` Testing Webhook Endpoint: ${TARGET_URL}`);
  console.log(`========================================\n`);

  const rawBody = JSON.stringify(samplePayload);
  const validHash = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');

  // Test 1: Valid Signature
  console.log('--- Test 1: Valid HMAC-SHA256 Signature ---');
  try {
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': `sha256=${validHash}`
      },
      body: rawBody
    });

    const data = await res.json();
    console.log(`Response Status: ${res.status}`);
    console.log('Response Body:', JSON.stringify(data, null, 2));

    if (res.status >= 200 && res.status < 300) {
      console.log('✅ Test 1 PASSED: Valid signature accepted!\n');
    } else {
      console.log('❌ Test 1 FAILED!\n');
    }
  } catch (err) {
    console.error('❌ Test 1 ERROR (Is server running?):', err.message);
  }

  // Test 2: Invalid Signature
  console.log('--- Test 2: Invalid HMAC Signature (Should be rejected with 401) ---');
  try {
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': `sha256=invalidhash1234567890abcdef1234567890abcdef1234567890abcdef12345678`
      },
      body: rawBody
    });

    const data = await res.json();
    console.log(`Response Status: ${res.status}`);
    if (res.status === 401) {
      console.log('✅ Test 2 PASSED: Invalid signature correctly rejected with 401!\n');
    } else {
      console.log('❌ Test 2 FAILED: Expected 401 but got', res.status, '\n');
    }
  } catch (err) {
    console.error('❌ Test 2 ERROR:', err.message);
  }

  // Test 3: Missing Signature
  console.log('--- Test 3: Missing Signature Header (Should be rejected with 401) ---');
  try {
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: rawBody
    });

    console.log(`Response Status: ${res.status}`);
    if (res.status === 401) {
      console.log('✅ Test 3 PASSED: Missing signature correctly rejected with 401!\n');
    } else {
      console.log('❌ Test 3 FAILED: Expected 401 but got', res.status, '\n');
    }
  } catch (err) {
    console.error('❌ Test 3 ERROR:', err.message);
  }
}

runTests();
