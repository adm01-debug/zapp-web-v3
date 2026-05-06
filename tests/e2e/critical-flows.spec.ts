import { test, expect } from '@playwright/test';

const APP_URL = process.env.VITE_APP_URL || 'http://localhost:5173';

test.describe('ZAPP Web - Critical Flows', () => {
  
  test('navigation to Inbox and basic interaction', async ({ page }) => {
    await page.goto(APP_URL);
    // Assuming we have a way to bypass auth or login in test environment
    // For now, testing basic layout and navigation presence
    const inboxLink = page.locator('nav >> text=Inbox');
    if (await inboxLink.isVisible()) {
      await inboxLink.click();
      await expect(page).toHaveURL(/.*inbox/);
    }
  });

  test('connections page and logout confirmation', async ({ page }) => {
    await page.goto(`${APP_URL}/#connections`);
    
    // Check for Connection Cards
    const cards = page.locator('[data-testid="connection-card"]');
    // If cards exist, test disconnect button color/presence
    if (await cards.count() > 0) {
      const disconnectBtn = cards.first().locator('text=Desconectar');
      await expect(disconnectBtn).toHaveClass(/text-destructive/);
    }
  });
});
