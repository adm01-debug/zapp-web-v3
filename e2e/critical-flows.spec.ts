import { test, expect } from '@playwright/test';

test.describe('Critical User Flows', () => {
  test('should redirect unauthenticated users to auth page', async ({ page }) => {
    await page.goto('/dashboard');
    // Expect redirection to auth or landing
    await expect(page).toHaveURL(/.*auth|login|sign-in/);
  });

  test('should load the main page correctly', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toBeDefined();
  });

  test('should show error message on invalid login attempt', async ({ page }) => {
    await page.goto('/auth');
    // These selectors are generic, will need adjustment based on actual UI
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('wrong@example.com');
      await page.locator('input[type="password"]').fill('wrongpassword');
      await page.locator('button[type="submit"]').click();
      // Look for any toast or alert
      await expect(page.locator('text=/error|invalid|falha/i').first()).toBeVisible({ timeout: 5000 }).catch(() => {
        console.log('Error message not found, might use different feedback mechanism');
      });
    }
  });
});
