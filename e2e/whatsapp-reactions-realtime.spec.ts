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

    await context1.close();
    await context2.close();
  });

  test('should track open_picker exactly once and show in operations dashboard', async ({ page }) => {
    // Collect console logs for analytics validation
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('[Analytics] Reaction Event: open_picker')) {
        logs.push(msg.text());
      }
    });

    await page.goto('/inbox');
    await page.locator('[data-testid^="conversation-item-"]').first().click();
    const message = page.locator('[data-testid^="message-bubble-"]').last();
    const messageId = await message.getAttribute('data-message-id');

    // Trigger open picker multiple times rapidly
    await message.hover();
    const trigger = page.locator(`[data-testid="reaction-trigger-${messageId}"]`);
    await trigger.click();
    await trigger.click();
    await trigger.click();

    // Verify analytics: should only track ONCE
    expect(logs.length).toBe(1);

    // React to trigger a real event
    await page.locator('button[aria-label="Reagir com 👍"]').first().click();

    // Navigate to Admin Operations Dashboard
    await page.goto('/admin/operations');
    await page.getByRole('tab', { name: /logs/i }).click();

    // Event should be visible in operations hub logs
    await expect(page.locator('text=Reaction Event: add').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${messageId}`).first()).toBeVisible();
  });

  test('should show standardized error messages and handle consecutive failures', async ({ page }) => {
    await page.goto('/inbox');
    await page.locator('[data-testid^="conversation-item-"]').first().click();
    const message = page.locator('[data-testid^="message-bubble-"]').last();

    // Test sequence: 401 then 504
    let callCount = 0;
    await page.route('**/rest/v1/message_reactions*', async (route) => {
      callCount++;
      const status = callCount === 1 ? 401 : 504;
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Error', code: status.toString() }),
      });
    });

    await message.hover();
    
    // First interaction (401)
    await page.locator('button[aria-label="Reagir com 😂"]').first().click();
    await expect(page.locator('text=Sessão expirada')).toBeVisible();

    // Second interaction (504)
    await page.locator('button[aria-label="Reagir com 😮"]').first().click();
    
    // Standardized 504 message
    await expect(page.locator('text=O servidor demorou muito para responder')).toBeVisible();
    
    // Toast Replacement Check: The 401 message should have been replaced/dismissed
    await expect(page.locator('text=Sessão expirada')).not.toBeVisible();
  });
});
