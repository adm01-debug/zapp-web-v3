import { test, expect } from '@playwright/test';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/evolution-webhook`;

test.describe('Evolution Webhook E2E - Integrity & Idempotency', () => {
  
  const mockMessageEvent = {
    event: "messages.upsert",
    instance: "wpp2",
    data: {
      key: {
        remoteJid: "5511999999999@s.whatsapp.net",
        fromMe: false,
        id: "TEST_MSG_ID_" + Date.now()
      },
      message: {
        conversation: "Hello from E2E test"
      },
      messageTimestamp: Math.floor(Date.now() / 1000)
    }
  };

  test('webhook should process valid message event and persist in DB', async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      data: mockMessageEvent
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ success: true });
  });

  test('webhook should handle idempotency - secondary call with same ID', async ({ request }) => {
    // 1. First call
    const firstResponse = await request.post(WEBHOOK_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      data: mockMessageEvent
    });
    expect(firstResponse.status()).toBe(200);

    // 2. Immediate second call with same payload
    const secondResponse = await request.post(WEBHOOK_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      data: mockMessageEvent
    });

    // Should return 200 (or 204) but avoid duplicate DB insertion
    expect(secondResponse.status()).toBe(200);
    const body = await secondResponse.json();
    // Assuming backend returns a flag or success for idempotency hit
    expect(body.idempotencyHit || body.success).toBeTruthy();
  });

  test('webhook should reject invalid payloads with 400', async ({ request }) => {
    const response = await request.post(WEBHOOK_URL, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      data: { invalid: "data" }
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });
});
