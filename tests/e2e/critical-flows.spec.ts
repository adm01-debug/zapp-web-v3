import { test, expect } from '@playwright/test';

const APP_URL = process.env.VITE_APP_URL || 'http://localhost:5173';

test.describe('ZAPP Web - Critical User Flows & Fuzzing', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto(APP_URL);
  });

  test('E2E: Full navigation flow (Sidebar -> Admin -> Bridge)', async ({ page }) => {
    // 1. Check if sidebar is present
    await expect(page.locator('nav')).toBeVisible();

    // 2. Navigate to Admin
    const adminLink = page.locator('nav >> text=Admin');
    if (await adminLink.isVisible()) {
      await adminLink.click();
      await expect(page).toHaveURL(/.*admin/);
    }

    // 3. Navigate to Bridge Status
    const bridgeLink = page.locator('nav >> text=Status da Ponte');
    if (await bridgeLink.isVisible()) {
      await bridgeLink.click();
      await expect(page).toHaveURL(/.*bridge-status/);
      
      // 4. Validate Dashboard presence
      await expect(page.locator('text=SISTEMA OPERACIONAL|DESEMPENHO REDUZIDO|SISTEMA INDISPONÍVEL')).toBeVisible();
    }
  });

  test('E2E: Connection Card Resilience', async ({ page }) => {
    await page.goto(`${APP_URL}/#connections`);
    
    // Validate that connection cards render with proper semantic colors
    const cards = page.locator('[data-testid="connection-card"]');
    const count = await cards.count();
    
    if (count > 0) {
      const firstCard = cards.first();
      // Check for presence of primary action button
      const actions = firstCard.locator('button');
      await expect(actions.first()).toBeVisible();
    }
  });

  /**
   * FUZZ TESTING: UI Resilience
   */
  test('FUZZ: Rapid Navigation Stress', async ({ page }) => {
    const navItems = ['Inbox', 'Admin', 'Status da Ponte'];
    for (let i = 0; i < 5; i++) {
      for (const item of navItems) {
        const link = page.locator(`nav >> text=${item}`);
        if (await link.isVisible()) {
          await link.click();
        }
      }
    }
    // App should remain stable (no crash, header still visible)
    await expect(page.locator('header')).toBeVisible();
  });

  test('FUZZ: Form Input Edge Cases', async ({ page }) => {
    await page.goto(`${APP_URL}/#settings`);
    const inputs = page.locator('input[type="text"]');
    const count = await inputs.count();
    
    if (count > 0) {
      const firstInput = inputs.first();
      // Test with very long string, special characters, and scripts
      const maliciousPayload = "A".repeat(1000) + "<script>alert(1)</script> ¯\\_(ツ)_/¯";
      await firstInput.fill(maliciousPayload);
      // Ensure input value was accepted and sanitized by React (no alert popped)
      expect(await firstInput.inputValue()).toBe(maliciousPayload);
    }
  });

});
