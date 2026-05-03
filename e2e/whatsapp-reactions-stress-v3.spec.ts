import { test, expect } from '@playwright/test';

test.describe('WhatsApp Message Reactions Advanced E2E', () => {
  test('should handle consecutive failures (401, 500, 504) with correct rollback and toast replacement', async ({ page }) => {
    await page.goto('/inbox');
    await page.locator('[data-testid^="conversation-item-"]').first().click();
    
    const message = page.locator('[data-testid^="message-bubble-"]').last();
    const messageId = await message.getAttribute('data-message-id');

    const failures = [
      { status: 401, text: 'Sessão expirada. Por favor, faça login novamente.' },
      { status: 500, text: 'Erro interno no servidor (500)' },
      { status: 504, text: 'O servidor demorou muito para responder. Tente novamente.' }
    ];

    for (const fail of failures) {
      await page.route('**/rest/v1/message_reactions*', async (route) => {
        await route.fulfill({
          status: fail.status,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Error', code: fail.status.toString() }),
        });
      });

      await message.hover();
      await page.locator('button[aria-label="Reagir com 😂"]').first().click();
      
      const toast = page.locator(`text=${fail.text}`);
      await expect(toast).toBeVisible();
      await expect(page.locator('.bg-destructive')).toBeVisible();

      // Check rollback
      await expect(page.locator(`[data-testid="reaction-${messageId}-😂"]`)).not.toBeVisible();

      await page.unroute('**/rest/v1/message_reactions*');
    }
  });

  test('should track analytics payload integrity and prevent duplicates', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[Analytics]')) logs.push(msg.text());
    });

    await page.goto('/inbox');
    await page.locator('[data-testid^="conversation-item-"]').first().click();
    
    const message = page.locator('[data-testid^="message-bubble-"]').last();
    const messageId = await message.getAttribute('data-message-id');

    // Rapid opening to test singleton event
    const trigger = page.locator(`[data-testid="reaction-trigger-${messageId}"]`);
    await message.hover();
    await trigger.click();
    await trigger.click(); // Fast consecutive clicks

    // Pick emoji
    await page.locator('button[aria-label="Reagir com 👍"]').first().click();

    // Give a moment for logs to process
    await page.waitForTimeout(500);

    const pickerEvents = logs.filter(l => l.includes('open_picker'));
    const addEvents = logs.filter(l => l.includes('add'));

    // Check Singleton
    expect(pickerEvents.length).toBe(1);
    
    // Validate Payload Integrity
    expect(pickerEvents[0]).toContain(`"messageId":"${messageId}"`);
    expect(addEvents[0]).toContain(`"emoji":"👍"`);
    expect(addEvents[0]).toContain(`"status":"success"`);
    expect(addEvents[0]).toContain(`"eventKey"`);
  });

  test('should verify real-time dashboard events appear without refresh', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const pageAdmin = await context1.newPage();
    const pageAgent = await context2.newPage();

    await pageAdmin.goto('/admin/operations'); 
    await pageAdmin.locator('button:has-text("Logs")').click();

    await pageAgent.goto('/inbox');
    await pageAgent.locator('[data-testid^="conversation-item-"]').first().click();
    const message = pageAgent.locator('[data-testid^="message-bubble-"]').last();
    await message.hover();
    await pageAgent.locator('button[aria-label="Reagir com ❤️"]').first().click();

    const logEntry = pageAdmin.locator('text=❤️').first();
    await expect(logEntry).toBeVisible({ timeout: 10000 });

    await context1.close();
    await context2.close();
  });
});
