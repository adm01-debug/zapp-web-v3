import { test, expect } from '@playwright/test';

test.describe('OLED Theme Visual Regression', () => {
  const routes = ['/', '/login', '/dashboard'];

  for (const route of routes) {
    test(`Visual test for ${route}`, async ({ page }) => {
      // Configura modo escuro forçado para o teste
      await page.addInitScript(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      });

      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Verifica se o background é preto puro (OLED)
      const bgColor = await page.evaluate(() => {
        return window.getComputedStyle(document.body).backgroundColor;
      });
      
      expect(bgColor).toBe('rgb(0, 0, 0)');

      // Screenshot para comparação visual (Desktop)
      await expect(page).toHaveScreenshot(`${route.replace(/\//g, 'root')}-desktop.png`);

      // Screenshot para comparação visual (Mobile)
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page).toHaveScreenshot(`${route.replace(/\//g, 'root')}-mobile.png`);
    });
  }
});
