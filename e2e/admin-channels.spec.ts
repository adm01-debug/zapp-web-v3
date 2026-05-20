import { test, expect } from './fixtures/auth';

test.describe('Admin — Canais', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/admin/channels');
    await page.waitForLoadState('networkidle').catch(() => {});
    const denied = await page.getByText(/acesso negado|forbidden/i).first().isVisible().catch(() => false);
    if (denied || !page.url().includes('/admin/channels')) {
      test.skip(true, 'Usuário sem permissão para /admin/channels');
    }
  });

  test('lista de canais renderiza', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    // Heading da página
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 5_000 });
  });

  test('toggle de status em canal de teste mostra feedback', async ({ authenticatedPage: page }) => {
    const toggle = page.getByRole('switch').first();
    if (!(await toggle.isVisible().catch(() => false))) {
      test.skip(true, 'Nenhum switch de status disponível');
    }
    const before = await toggle.getAttribute('aria-checked');
    await toggle.click();
    // Toast OU mudança de aria-checked
    await page.waitForTimeout(500);
    const after = await toggle.getAttribute('aria-checked');
    const toast = await page.getByText(/atualizado|sucesso|salvo|pausado|reativado/i).first().isVisible().catch(() => false);
    expect(before !== after || toast).toBeTruthy();

    // Reverte para não deixar sujeira
    if (before !== after) {
      await toggle.click().catch(() => {});
    }
  });
});
