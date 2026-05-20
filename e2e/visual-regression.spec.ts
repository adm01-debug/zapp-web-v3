import { test, expect } from '@playwright/test';

test.describe('Visual Regression - Typography', () => {
  test('Typography validation examples page', async ({ page }) => {
    // Navigate to a page with typography examples
    await page.goto('/debug/fonts');
    
    // Wait for the fonts to load if possible, or just a small timeout
    await page.waitForTimeout(1000);
    
    // Validate the page matches the snapshot
    await expect(page).toHaveScreenshot('typography-validation.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  test('Team Chat Panel typography', async ({ page }) => {
    // This requires being logged in usually, but we can try to screenshot the layout
    // or a dedicated test component
    await page.goto('/team-chat');
    await page.waitForTimeout(1000);
    
    await expect(page).toHaveScreenshot('team-chat-typography.png', {
      mask: [page.locator('[data-testid="dynamic-content"]')],
    });
  });
});
