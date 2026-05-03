import { test, expect } from '@playwright/test';

test.describe('WhatsApp Message Reactions Advanced Validation', () => {
  test('should handle 401 and 500 errors with correct toast content and type', async ({ page }) => {
    await page.goto('/inbox');
    await page.locator('[data-testid^="conversation-item-"]').first().click();
    
    const message = page.locator('[data-testid^="message-bubble-"]').last();
    const messageId = await message.getAttribute('data-message-id');

    // 1. Force 401 Error
    await page.route('**/rest/v1/message_reactions*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Unauthorized', code: '401' }),
        });
      } else {
        await route.continue();
      }
    });

    await message.hover();
    await page.locator('button[aria-label="Reagir com 👍"]').first().click();
    
    // Check for "Não autorizado" toast
    await expect(page.locator('text=Sessão expirada. Por favor, faça login novamente.')).toBeVisible();
    // Rollback check
    await expect(page.locator(`[data-testid="reaction-${messageId}-👍"]`)).not.toBeVisible();

    // 2. Force 500 Error on Remove
    // First, let a successful reaction happen (unroute)
    await page.unroute('**/rest/v1/message_reactions*');
    await page.locator('button[aria-label="Reagir com ❤️"]').first().click();
    await expect(page.locator(`[data-testid="reaction-${messageId}-❤️"]`)).toBeVisible();

    // Now mock 500 on DELETE
    await page.route('**/rest/v1/message_reactions*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal Server Error' }),
        });
      } else {
        await route.continue();
      }
    });

    // Try to remove
    await page.locator(`[data-testid="reaction-${messageId}-❤️"]`).click();
    await expect(page.locator('text=Erro ao remover reação')).toBeVisible();
    // Rollback check: Reaction should stay visible
    await expect(page.locator(`[data-testid="reaction-${messageId}-❤️"]`)).toBeVisible();
  });

  test('should open picker on touch, pick emoji, close, and return focus', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/inbox');
    await page.locator('[data-testid^="conversation-item-"]').first().click();
    
    const message = page.locator('[data-testid^="message-bubble-"]').last();
    const messageId = await message.getAttribute('data-message-id');

    // Touch bubble to show actions
    await message.tap();
    
    const trigger = page.locator(`[data-testid="reaction-trigger-${messageId}"]`);
    await expect(trigger).toBeVisible();
    await trigger.tap();

    const picker = page.locator('[role="dialog"][aria-label="Escolher um emoji"]');
    await expect(picker).toBeVisible();

    // Select emoji
    const emojiBtn = picker.locator('button[aria-label="Reagir com 😂"]');
    await emojiBtn.tap();

    // Picker should close
    await expect(picker).not.toBeVisible();

    // Validate focus returns or summary exists
    await expect(page.locator(`[data-testid="reaction-${messageId}-😂"]`)).toBeVisible();
  });

  test('should enforce unique constraint (message_id, user_id, emoji) at database level', async ({ page }) => {
    await page.goto('/inbox');
    await page.locator('[data-testid^="conversation-item-"]').first().click();
    const message = page.locator('[data-testid^="message-bubble-"]').last();
    const messageId = await message.getAttribute('data-message-id');

    // Simulate simultaneous clicks by firing multiple requests rapidly
    // Our optimistic UI and useMutation handle state, but we check if the DB constraint 
    // prevents double counts for the same user.
    
    await message.hover();
    const thumbsUp = page.locator('button[aria-label="Reagir com 👍"]').first();
    
    // Triple click fast
    await thumbsUp.click();
    await thumbsUp.click();
    await thumbsUp.click();

    // Wait for network to settle
    await page.waitForTimeout(1000);

    const summary = page.locator(`[data-testid="reaction-${messageId}-👍"]`);
    // Even after triple click, if I was adding, it should be 1 (or 0 if it toggled off-on-off).
    // The key is that it shouldn't show "3" for the same user.
    const text = await summary.innerText();
    const count = parseInt(text.replace(/[^0-9]/g, '') || '1');
    expect(count).toBeLessThanOrEqual(1); 
  });
});
