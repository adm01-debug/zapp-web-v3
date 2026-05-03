import { test, expect } from '@playwright/test';

test.describe('WhatsApp Message Reactions Advanced', () => {
  test('should rollback optimistically on backend error (500)', async ({ page }) => {
    await page.goto('/inbox');
    await page.locator('[data-testid^="conversation-item-"]').first().click();
    
    const message = page.locator('[data-testid^="message-bubble-"]').last();
    const messageId = await message.getAttribute('data-message-id');

    // Intercept Supabase request to force a 500 error
    await page.route('**/rest/v1/message_reactions*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error', code: '500' }),
        });
      } else {
        await route.continue();
      }
    });

    // Try to react
    await message.hover();
    const thumbsUp = page.locator('button[aria-label="Reagir com 👍"]').first();
    await thumbsUp.click();

    // Verify optimistic update (should appear briefly)
    const reactionSummary = page.locator(`[data-testid="reaction-${messageId}-👍"]`);
    // Note: This might be too fast to catch without a small delay in the mock, 
    // but the rollback should definitely happen.
    
    // Verify toast error
    await expect(page.locator('text=Erro ao adicionar reação: Erro interno no servidor (500)')).toBeVisible();
    
    // Verify rollback
    await expect(reactionSummary).not.toBeVisible();
  });

  test('should sync reactions in real-time between two clients', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Setup both pages
    await Promise.all([
      page1.goto('/inbox'),
      page2.goto('/inbox')
    ]);

    // Select same conversation on both
    const convId = await page1.locator('[data-testid^="conversation-item-"]').first().getAttribute('data-conversation-id');
    await Promise.all([
      page1.locator(`[data-conversation-id="${convId}"]`).click(),
      page2.locator(`[data-conversation-id="${convId}"]`).click()
    ]);

    const message = page1.locator('[data-testid^="message-bubble-"]').last();
    const messageId = await message.getAttribute('data-message-id');

    // Client 1 reacts
    await message.hover();
    await page1.locator('button[aria-label="Reagir com ❤️"]').first().click();

    // Verify on Client 2
    const reactionOn2 = page2.locator(`[data-testid="reaction-${messageId}-❤️"]`);
    await expect(reactionOn2).toBeVisible();
    await expect(reactionOn2).toContainText('1');

    // Client 2 adds same reaction (count should go to 2)
    const msg2 = page2.locator(`[data-testid="message-bubble-${messageId}"]`); // Need a reliable selector
    // In our implementation, clicking the existing reaction summary acts as a toggle.
    await reactionOn2.click();
    await expect(reactionOn2).toContainText('2');

    // Verify on Client 1
    const reactionOn1 = page1.locator(`[data-testid="reaction-${messageId}-❤️"]`);
    await expect(reactionOn1).toContainText('2');

    // Popularity sort test: Client 1 adds a different reaction multiple times (simulated)
    // Actually, just add another one and check order.
    await page1.locator('button[aria-label="Reagir com 👍"]').first().click();
    
    // Wait for sort update
    const firstReaction = page1.locator(`[data-testid^="reaction-${messageId}-"]`).first();
    await expect(firstReaction).toHaveAttribute('data-testid', `reaction-${messageId}-❤️`); // ❤️ has 2, 👍 has 1

    await context1.close();
    await context2.close();
  });

  test('should support mobile touch to open picker and maintain accessibility', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/inbox');
    
    await page.locator('[data-testid^="conversation-item-"]').first().click();
    const message = page.locator('[data-testid^="message-bubble-"]').last();
    const messageId = await message.getAttribute('data-message-id');

    // Mobile specific: The bubble itself or the trigger should be clickable
    const trigger = page.locator(`[data-testid="reaction-trigger-${messageId}"]`);
    
    // Validate accessibility
    await expect(trigger).toHaveAttribute('aria-label', 'Adicionar reação');
    
    await trigger.tap();
    
    // Picker should be visible
    const picker = page.locator('[role="dialog"][aria-label="Escolher um emoji"]');
    await expect(picker).toBeVisible();
    
    // React with keyboard navigation (if possible on mobile emu) or just touch
    const emoji = picker.locator('button[aria-label="Reagir com 😂"]');
    await emoji.tap();
    
    const summary = page.locator(`[data-testid="reaction-${messageId}-😂"]`);
    await expect(summary).toBeVisible();
  });
});
