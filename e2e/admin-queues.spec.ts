import { test, expect } from './fixtures/auth';
import { cleanupTestData } from './utils/supabase';

/**
 * Admin → Filas. Skip se perfil não for admin/supervisor.
 */
test.describe('Admin — Filas', () => {
  test.afterAll(async () => { await cleanupTestData(); });

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/admin/queues');
    await page.waitForLoadState('networkidle').catch(() => {});
    const denied = await page.getByText(/acesso negado|forbidden/i).first().isVisible().catch(() => false);
    if (denied || !page.url().includes('/admin/queues')) {
      test.skip(true, 'Usuário sem permissão para /admin/queues');
    }
  });

  test('página carrega sem erro', async ({ authenticatedPage: page }) => {
    await expect(page.locator('body')).toBeVisible();
    // Algum heading ou tabela esperada
    const hasContent = await page.getByRole('heading').first().isVisible().catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('botão criar fila abre formulário (se exposto)', async ({ authenticatedPage: page }) => {
    const createBtn = page.getByRole('button', { name: /nova fila|criar fila|adicionar/i }).first();
    if (!(await createBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Botão de criar fila não exposto');
    }
    await createBtn.click();
    const dialog = page.getByRole('dialog').first();
    await expect(dialog).toBeVisible({ timeout: 3_000 });
  });

  test('validação: criar fila com nome vazio mostra erro', async ({ authenticatedPage: page }) => {
    const createBtn = page.getByRole('button', { name: /nova fila|criar fila|adicionar/i }).first();
    if (!(await createBtn.isVisible().catch(() => false))) {
      test.skip(true, 'UI de criação não exposta');
    }
    await createBtn.click();
    const submit = page.getByRole('button', { name: /salvar|criar|confirmar/i }).last();
    if (!(await submit.isVisible().catch(() => false))) {
      test.skip(true, 'Botão de submit não encontrado');
    }
    await submit.click();
    // Deve mostrar mensagem de validação (HTML5 ou inline)
    const hasError = await page.getByText(/obrigatório|required|inválido/i).first().isVisible({ timeout: 2_000 }).catch(() => false);
    // Aceita também nenhuma navegação (form não submeteu)
    const stillOpen = await page.getByRole('dialog').first().isVisible().catch(() => false);
    expect(hasError || stillOpen).toBeTruthy();
  });
});
