import { test, expect } from './fixtures/auth';

test.describe('Contact media gallery', () => {
  test('não abre automaticamente e pode ser fechada', async ({ authenticatedPage: page }) => {
    await page.goto('/');

    // 1. Selecionar primeira conversa disponível (skip se vazio)
    const firstConv = page
      .locator('[data-testid="conversation-item"], [role="listitem"]')
      .first();
    if (!(await firstConv.isVisible().catch(() => false))) {
      test.skip(true, 'Nenhuma conversa disponível para o usuário de teste');
    }
    await firstConv.click();

    // 2. Esperar área de chat — garante que ContactDetails montou
    await expect(
      page.locator('[role="log"], [data-testid="chat-messages"]').first(),
    ).toBeVisible({ timeout: 10_000 });

    // 3. Galeria NÃO deve estar visível automaticamente
    const gallery = page.getByRole('dialog', { name: /Galeria de Mídia/i });
    await expect(gallery).toBeHidden();

    // 4. Localizar botão "Abrir galeria" — expandir accordion se necessário
    let openBtn = page.getByRole('button', { name: /Abrir galeria/i });
    if (!(await openBtn.isVisible().catch(() => false))) {
      const mediaTrigger = page.getByRole('button', { name: /Mídia Compartilhada/i });
      if (await mediaTrigger.isVisible().catch(() => false)) {
        await mediaTrigger.click();
      }
      openBtn = page.getByRole('button', { name: /Abrir galeria/i });
    }
    await expect(openBtn).toBeVisible({ timeout: 5_000 });
    await openBtn.click();

    // 5. Galeria abre
    await expect(gallery).toBeVisible({ timeout: 5_000 });

    // 6. Fechar via Escape (caminho determinístico em Radix Dialog)
    await page.keyboard.press('Escape');
    await expect(gallery).toBeHidden({ timeout: 5_000 });
  });
});
