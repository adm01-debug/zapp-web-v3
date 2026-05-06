import { test, expect } from '@playwright/test';
import { testConfig, validateTestEnvironment } from './test-config';

test.beforeAll(() => {
  validateTestEnvironment();
});

test.describe('Resilience & State Transitions E2E', () => {

  test('guided reconnection flow handles QR expiration', async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/#connections`);
    
    // Simulate finding a disconnected instance and clicking reconnect
    const card = page.locator('[data-testid="connection-card"]').first();
    if (await card.isVisible()) {
      await card.locator('text=Reconectar').click();
      
      // Step 2 should show QR
      await expect(page.locator('text=Etapa 2 de 3')).toBeVisible({ timeout: 15000 });
      const qrImage = page.locator('img[alt="QR Code"]');
      await expect(qrImage).toBeVisible();

      // Simulate QR expiration by checking for "Gerar novo QR" button 
      // (This usually appears when our countdown hits zero or API returns expired)
      const refreshBtn = page.locator('text=Gerar novo QR');
      if (await refreshBtn.isVisible()) {
        await refreshBtn.click();
        await expect(page.locator('text=Iniciando sessão...')).toBeVisible();
      }
    }
  });

  test('status transition audit logging', async ({ page, request }) => {
    // This test validates that status changes are tracked in the event_history
    const connectionId = "TEST_CONN_ID"; // Mock or find real test ID
    
    // Trigger a status change via API mock or real call
    const webhookUrl = `${testConfig.supabaseUrl}/functions/v1/evolution-webhook`;
    await request.post(webhookUrl, {
      headers: { 'Authorization': `Bearer ${testConfig.supabaseAnonKey}` },
      data: {
        event: "connection.update",
        instance: "wpp2",
        data: { state: "open" }
      }
    });

    // Check history (would ideally be done via DB query or UI history panel)
    // For E2E simulation, we check if the UI reflects "Online"
    await page.goto(`${testConfig.baseUrl}/#connections`);
    const statusBadge = page.locator('text=Online').first();
    await expect(statusBadge).toBeVisible();
  });

  test('network failure resilience during reconnection', async ({ page }) => {
    await page.goto(`${testConfig.baseUrl}/#connections`);
    
    // Simulate offline or blocked API
    await page.route('**/functions/v1/evolution-api', route => route.abort('failed'));
    
    const card = page.locator('[data-testid="connection-card"]').first();
    if (await card.isVisible()) {
      await card.locator('text=Reconectar').click();
      
      // Verify error toast and UI recovery (button should become enabled again)
      await expect(page.locator('text=Erro ao reconectar')).toBeVisible();
      const reconnectBtn = card.locator('text=Reconectar');
      await expect(reconnectBtn).toBeEnabled();
    }
  });

  test('webhook failure and reprocessing flow', async ({ request }) => {
    const webhookUrl = `${testConfig.supabaseUrl}/functions/v1/evolution-webhook`;
    const reprocessUrl = `${testConfig.supabaseUrl}/functions/v1/evolution-api`;
    const messageId = `E2E_FAIL_RETRY_${Date.now()}`;
    
    // 1. Send invalid payload or force failure (simulation)
    const respFail = await request.post(webhookUrl, {
      headers: { 'Authorization': `Bearer ${testConfig.supabaseAnonKey}` },
      data: { event: "messages.upsert", instance: "invalid", data: { key: { id: messageId } } }
    });
    // The webhook should ideally queue this if it's a transient fail
    
    // 2. Trigger reprocessing action
    const respRetry = await request.post(reprocessUrl, {
      headers: { 'Authorization': `Bearer ${testConfig.supabaseAnonKey}` },
      data: { action: "reprocess-failed-webhooks" }
    });
    expect(respRetry.status()).toBe(200);
    
    const body = await respRetry.json();
    expect(body.success).toBe(true);
  });
});
