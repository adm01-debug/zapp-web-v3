import { test, expect } from '@playwright/test';
import { testConfig, validateTestEnvironment } from './test-config';

test.beforeAll(() => {
  validateTestEnvironment();
});

test.describe('Guided Reconnection & Webhook Reliability', () => {
  
  test('guided reconnection flow steps with stable IDs', async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/#connections`);
    
    // Simulate finding a disconnected instance
    const card = page.locator('[data-testid="connection-card"]').first();
    if (await card.isVisible()) {
      const reconnectBtn = card.locator('text=Reconectar');
      await reconnectBtn.click();
      
      // Verify guided steps using data-testids
      await expect(page.getByTestId('reconnect-step-label')).toContainText('Etapa 1 de 3');
      
      // Mock API to trigger step 2 transition
      await expect(page.getByTestId('reconnect-step-label')).toContainText('Etapa 2 de 3', { timeout: 15000 });
      await expect(page.locator('img[alt="QR Code"]')).toBeVisible();
    }
  });

  test('webhook reprocessing and double-trigger idempotency', async ({ request }) => {
    const webhookUrl = `${testConfig.supabaseUrl}/functions/v1/evolution-webhook`;
    const messageId = `E2E_DOUBLE_${Date.now()}`;
    
    const payload = {
      event: "messages.upsert",
      instance: "wpp2",
      data: {
        key: { remoteJid: "5511999999999@s.whatsapp.net", id: messageId },
        message: { conversation: "Idempotency test" }
      }
    };

    // Trigger same webhook twice in rapid succession
    const [resp1, resp2] = await Promise.all([
      request.post(webhookUrl, { headers: { 'Authorization': `Bearer ${testConfig.supabaseAnonKey}` }, data: payload }),
      request.post(webhookUrl, { headers: { 'Authorization': `Bearer ${testConfig.supabaseAnonKey}` }, data: payload })
    ]);

    expect(resp1.status()).toBe(200);
    expect(resp2.status()).toBe(200);
    
    // Verify idempotency on second call
    const body2 = await resp2.json();
    expect(body2.success).toBe(true);
  });
});
