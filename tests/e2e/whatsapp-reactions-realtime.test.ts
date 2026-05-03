import { test, expect } from '@playwright/test';

test.describe('WhatsApp Message Reactions E2E Realtime & Error Standardization', () => {
  test('should synchronize reactions in real-time across two browser contexts', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // 1. Both go to inbox
    await Promise.all([
      page1.goto('/inbox'),
      page2.goto('/inbox')
    ]);

    // 2. Select same conversation
    const conv = page1.locator('[data-testid^="conversation-item-"]').first();
    const convId = await conv.getAttribute('data-conversation-id');
    await Promise.all([
      page1.locator(`[data-conversation-id="${convId}"]`).click(),
      page2.locator(`[data-conversation-id="${convId}"]`).click()
    ]);

    const message = page1.locator('[data-testid^="message-bubble-"]').last();
    const messageId = await message.getAttribute('data-message-id');

    // 3. User 1 adds ❤️
    await message.hover();
    await page1.locator('button[aria-label="Reagir com ❤️"]').first().click();

    // 4. Validate User 2 sees it instantly (Realtime check)
    const reactionOn2 = page2.locator(`[data-testid="reaction-${messageId}-❤️"]`);
    await expect(reactionOn2).toBeVisible({ timeout: 5000 });
    await expect(reactionOn2).toContainText('1');

    // 5. User 2 adds 👍 (Summary order should update if popularity changes)
    await page2.locator(`[data-testid="message-bubble-${messageId}"]`).hover();
    await page2.locator('button[aria-label="Reagir com 👍"]').first().click();
    
    // User 1 sees 👍
    await expect(page1.locator(`[data-testid="reaction-${messageId}-👍"]`)).toBeVisible();

    await context1.close();
    await context2.close();
  });

  test('should show standardized error messages for 401, 500, and 504', async ({ page }) => {
    await page.goto('/inbox');
    await page.locator('[data-testid^="conversation-item-"]').first().click();
    const message = page.locator('[data-testid^="message-bubble-"]').last();
    const messageId = await message.getAttribute('data-message-id');

    const errorCases = [
      { status: 401, expected: 'Sessão expirada. Por favor, faça login novamente.' },
      { status: 500, expected: 'Erro interno no servidor (500)' },
      { status: 504, expected: 'O servidor demorou muito para responder. Tente novamente.' }
    ];

    for (const errorCase of errorCases) {
      await page.route('**/rest/v1/message_reactions*', async (route) => {
        await route.fulfill({
          status: errorCase.status,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Error', code: errorCase.status.toString() }),
        });
      });

      await message.hover();
      await page.locator('button[aria-label="Reagir com 😂"]').first().click();
      
      await expect(page.locator(`text=${errorCase.expected}`)).toBeVisible();
      
      // Cleanup for next case
      await page.unroute('**/rest/v1/message_reactions*');
      // Wait for toast to disappear or clear it if possible
    }
  });
});
