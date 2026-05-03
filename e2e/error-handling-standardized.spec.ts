import { test, expect } from './fixtures/auth';

/**
 * Standardized Error Handling E2E.
 * Validates 401/500/504 toast messages and optimistic UI consistency.
 */
test.describe('Standardized Error Toasts & Rollback', () => {
  
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/inbox');
    // Ensure we are in a chat
    const firstChat = page.locator('[data-testid="conversation-item"]').first();
    if (await firstChat.isVisible()) {
      await firstChat.click();
    }
  });

  test('401 error displays "Sessão expirada" and replaces previous toast', async ({ authenticatedPage: page }) => {
    // Intercept reactions with 401
    await page.route('**/rest/v1/message_reactions*', (route) => {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'unauthorized', message: 'JWT expired' })
      });
    });

    const msg = page.locator('[data-testid="chat-message"]').last();
    await msg.hover();
    const pickerBtn = page.locator('[data-testid="add-reaction-button"]').last();
    await pickerBtn.click();
    
    // Select an emoji
    await page.locator('text=❤️').first().click();

    // Check standardized message
    const toast = page.locator('[data-testid="toast"]');
    await expect(toast).toContainText('Sessão expirada. Por favor, faça login novamente.');
  });

  test('504 timeout displays "servidor demorou muito" and maintains rollback consistency', async ({ authenticatedPage: page }) => {
    // Intercept reactions with 504
    await page.route('**/rest/v1/message_reactions*', (route) => {
      return route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'gateway_timeout' })
      });
    });

    const msg = page.locator('[data-testid="chat-message"]').last();
    await msg.hover();
    
    // Get current reaction count if any
    const initialCount = await page.locator('[data-testid="reaction-badge"]').count();
    
    const pickerBtn = page.locator('[data-testid="add-reaction-button"]').last();
    await pickerBtn.click();
    await page.locator('text=👍').first().click();

    // Standardized message
    const toast = page.locator('[data-testid="toast"]');
    await expect(toast).toContainText('servidor demorou muito para responder');

    // Verify rollback: count should return to initial
    await expect(page.locator('[data-testid="reaction-badge"]')).toHaveCount(initialCount);
  });

  test('consecutive failures replace the toast with same stable ID', async ({ authenticatedPage: page }) => {
    let callCount = 0;
    await page.route('**/rest/v1/message_reactions*', (route) => {
      callCount++;
      return route.fulfill({
        status: callCount === 1 ? 500 : 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'error' })
      });
    });

    const msg = page.locator('[data-testid="chat-message"]').last();
    await msg.hover();
    
    // First fail (500)
    await page.locator('[data-testid="add-reaction-button"]').last().click();
    await page.locator('text=❤️').first().click();
    await expect(page.locator('[data-testid="toast"]')).toContainText('Erro interno no servidor');

    // Second fail (401)
    await page.locator('[data-testid="add-reaction-button"]').last().click();
    await page.locator('text=😂').first().click();
    
    // Should only have ONE toast because of stable ID replacement
    const toastCount = await page.locator('[data-testid="toast"]').count();
    expect(toastCount).toBe(1);
    await expect(page.locator('[data-testid="toast"]')).toContainText('Sessão expirada');
  });
});
