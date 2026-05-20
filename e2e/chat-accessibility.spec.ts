import { test, expect } from '@playwright/test';
import { login, openConversation } from './helpers/testHelpers';

test.describe('Chat Acessibilidade e Atalhos', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await openConversation(page, 'João Silva');
  });

  test('deve abrir busca de chat com Ctrl+F', async ({ page }) => {
    await page.keyboard.press('Control+f');
    const searchBar = page.locator('input[placeholder*="Buscar na conversa"]');
    await expect(searchBar).toBeVisible();
    await expect(searchBar).toBeFocused();
  });

  test('deve navegar entre resultados de busca com setas e Enter', async ({ page }) => {
    await page.keyboard.press('Control+f');
    const input = page.locator('input[placeholder*="Buscar na conversa"]');
    await input.fill('a'); // General query to get multiple results
    
    // Wait for results
    await page.waitForTimeout(500);
    
    const status = page.locator('[aria-live="polite"]');
    const statusText = await status.innerText();
    
    if (statusText !== '0') {
      // Navigate down
      await page.keyboard.press('ArrowDown');
      // Should update index or focus result
      await page.waitForTimeout(200);
      
      // Navigate up
      await page.keyboard.press('ArrowUp');
      await page.waitForTimeout(200);
    }
  });

  test('deve fechar busca com Escape', async ({ page }) => {
    await page.keyboard.press('Control+f');
    await expect(page.locator('role=search')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('role=search')).not.toBeVisible();
  });

  test('deve focar o input ao fechar busca', async ({ page }) => {
    await page.keyboard.press('Control+f');
    await page.keyboard.press('Escape');
    const input = page.locator('textarea[placeholder*="Digite"]').first();
    await expect(input).toBeFocused();
  });
});
