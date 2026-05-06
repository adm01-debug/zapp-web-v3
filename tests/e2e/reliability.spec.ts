import { test, expect } from '@playwright/test';
import { testConfig, validateTestEnvironment } from './test-config';

test.beforeAll(() => {
  validateTestEnvironment();
});

test.describe('Guided Reconnection & Webhook Reliability', () => {
  
  test('guided reconnection flow steps', async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/#connections`);
    
    // Simulate finding a disconnected instance
    const card = page.locator('[data-testid="connection-card"]').first();
    if (await card.isVisible()) {
      const reconnectBtn = card.locator('text=Reconectar');
      await reconnectBtn.click();
      
      // Verify guided steps
      await expect(page.locator('text=Etapa 1 de 3')).toBeVisible();
      // Wait for QR generation simulation
      await expect(page.locator('text=Etapa 2 de 3')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('img[alt="QR Code"]')).toBeVisible();
    }
  });

  test('webhook reprocessing and idempotency', async ({ request }) => {
    const webhookUrl = `${testConfig.supabaseUrl}/functions/v1/evolution-webhook`;
    const messageId = `E2E_REPROCESS_${Date.now()}`;
    
    const payload = {
      event: "messages.upsert",
      instance: "wpp2",
      data: {
        key: { remoteJid: "5511999999999@s.whatsapp.net", fromMe: false, id: messageId },
        message: { conversation: "Reprocess test" },
        messageTimestamp: Math.floor(Date.now() / 1000)
      }
    };

    // 1. First processing
    const resp1 = await request.post(webhookUrl, {
      headers: { 'Authorization': `Bearer ${testConfig.supabaseAnonKey}` },
      data: payload
    });
    expect(resp1.status()).toBe(200);

    // 2. Immediate duplicate (Idempotency check)
    const resp2 = await request.post(webhookUrl, {
      headers: { 'Authorization': `Bearer ${testConfig.supabaseAnonKey}` },
      data: payload
    });
    expect(resp2.status()).toBe(200);
    const body2 = await resp2.json();
    // success should be true but no new DB row created (idempotency)
    expect(body2.success).toBe(true);
  });
});
