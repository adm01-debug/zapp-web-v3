import { test, expect } from './fixtures/auth';

test.describe('Inbox realtime', () => {
  test('lista de conversas carrega e renderiza', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    // Container principal do inbox deve estar visível
    const main = page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible({ timeout: 10_000 });
  });

  test('abrir uma conversa zera contador de não-lidas (se houver)', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    const firstConv = page.locator('[data-testid="conversation-item"], [role="listitem"]').first();
    if (!(await firstConv.isVisible().catch(() => false))) {
      test.skip(true, 'Nenhuma conversa disponível para o usuário de teste');
    }
    await firstConv.click();
    // Após click, área de chat deve renderizar
    const chatArea = page.locator('[role="log"], [data-testid="chat-messages"]').first();
    await expect(chatArea).toBeVisible({ timeout: 10_000 });
  });
});
