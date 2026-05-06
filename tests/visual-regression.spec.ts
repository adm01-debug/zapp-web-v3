import { test, expect } from '@playwright/test';

test.describe('Design System Visual Regression', () => {
  test('should match snapshot for components page', async ({ page }) => {
    await page.goto('/design-system');
    
    // Wait for animations to finish or elements to be stable
    await page.waitForSelector('h1');
    
    // Take a screenshot of the entire page
    await expect(page).toHaveScreenshot('design-system-page.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.01,
    });
  });

  const components = ['button', 'input', 'badge', 'card'];
  
  for (const component of components) {
    test(`should match snapshot for ${component} section`, async ({ page }) => {
      await page.goto('/design-system');
      const section = page.locator(`section:has-text("${component}")`);
      await expect(section).toHaveScreenshot(`design-system-${component}.png`);
    });
  }
});
