import { test, expect } from '@playwright/test';

test.describe('Chat E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login e navegação para o Inbox
    await page.goto('/inbox');
  });

  test('User can search and navigate results', async ({ page }) => {
    // 1. Abrir primeira conversa
    await page.locator('[data-testid="conversation-item"]').first().click();
    
    // 2. Abrir Busca
    await page.locator('button[aria-label="Buscar (Ctrl+K)"]').click();
    const searchInput = page.placeholder('Buscar na conversa...');
    await expect(searchInput).toBeVisible();

    // 3. Digitar busca
    await searchInput.fill('teste');
    
    // 4. Verificar se resultados aparecem
    await expect(page.locator('text=/\\d+\\/\\d+/')).toBeVisible();

    // 5. Navegar para próximo
    await page.keyboard.press('ArrowDown');
    
    // 6. Verificar se o scroll ocorreu (ajuste de offset)
    const activeMsg = page.locator('[data-search-highlight="true"].ring-primary');
    await expect(activeMsg).toBeVisible();
  });

  test('Visual Regression - Density Toggles', async ({ page }) => {
    await page.locator('[data-testid="conversation-item"]').first().click();
    
    const header = page.locator('header');
    
    // Captura modo confortável
    await expect(page).toHaveScreenshot('chat-comfortable.png');

    // Alterna para compacto
    await page.locator('button[aria-label^="Densidade"]').click();
    await expect(page).toHaveScreenshot('chat-compact.png');
    
    // Alterna para denso
    await page.locator('button[aria-label^="Densidade"]').click();
    await expect(page).toHaveScreenshot('chat-dense.png');
  });
});
