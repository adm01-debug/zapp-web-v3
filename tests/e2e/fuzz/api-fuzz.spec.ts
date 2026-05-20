import { test, expect } from '@playwright/test';

const APP_URL = process.env.VITE_APP_URL || 'http://localhost:5173';

test.describe('ZAPP Web - Integration & Fuzzing', () => {

  test('Fuzzing: Invalid Webhook Payloads', async ({ request }) => {
    const maliciousPayloads = [
      { action: "invalid", instance: "test" },
      { garbage: true, data: "null" },
      { instance: "'; DROP TABLE users; --" },
      {}
    ];

    for (const payload of maliciousPayloads) {
      const response = await request.post(`${APP_URL}/functions/v1/evolution-webhook`, {
        data: payload
      });
      // Webhook should handle garbage gracefully, typically 200 or 400 but NOT 500
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('Fuzzing: API Buffer Overflows & Scripts', async ({ request }) => {
    const response = await request.post(`${APP_URL}/functions/v1/evolution-api`, {
      data: {
        action: "send-text",
        text: "A".repeat(10000), // Stress test
        number: "5511999999999",
        instanceName: "<script>alert('xss')</script>"
      }
    });
    // Should be handled by the proxy without crashing
    expect(response.status()).toBeLessThan(500);
  });
});
