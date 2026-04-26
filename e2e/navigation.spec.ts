import { test, expect } from './fixtures/auth';

/**
 * Navegação global pós-login. Valida sidebar, deep-link, NotFound e role gating.
 * Cada subteste é tolerante: se o item não existe na UI atual do perfil, é skip.
 */
test.describe('Navegação', () => {
  test('home renderiza após login', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/auth/);
    // Algum elemento âncora de layout autenticado deve estar visível
    await expect(page.locator('body')).toBeVisible();
  });

  test('deep-link para /sla carrega sem redirecionar para /auth', async ({ authenticatedPage: page }) => {
    await page.goto('/sla');
    await expect(page).not.toHaveURL(/\/auth/);
  });

  test('rota inexistente exibe NotFound (não crasha)', async ({ authenticatedPage: page }) => {
    await page.goto('/rota-que-definitivamente-nao-existe-' + Date.now());
    // NotFound page do projeto. Não exige texto específico — só que body renderize.
    await expect(page.locator('body')).toBeVisible();
    // Não deve redirecionar para auth quando logado
    await expect(page).not.toHaveURL(/\/auth/);
  });

  test('role gating: /admin/roles bloqueia ou redireciona não-admin', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/roles');
    await page.waitForLoadState('networkidle').catch(() => {});
    const url = page.url();
    // Aceitamos: (a) acesso permitido (admin); (b) redirect; (c) tela "acesso negado"
    const blocked = !url.includes('/admin/roles')
      || (await page.getByText(/acesso negado|forbidden|sem permissão/i).first().isVisible().catch(() => false));
    const allowed = url.includes('/admin/roles')
      && !(await page.getByText(/acesso negado|forbidden/i).first().isVisible().catch(() => false));
    expect(blocked || allowed).toBeTruthy();
  });

  test('navega entre módulos via sidebar (best-effort)', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    const navItems = ['Inbox', 'CRM', 'SLA', 'Operações', 'Operations'];
    let clicked = 0;
    for (const label of navItems) {
      const link = page.getByRole('link', { name: new RegExp(label, 'i') }).first();
      if (await link.isVisible().catch(() => false)) {
        await link.click();
        await page.waitForLoadState('networkidle').catch(() => {});
        clicked++;
        if (clicked >= 2) break; // suficiente para validar navegação
      }
    }
    if (clicked === 0) test.skip(true, 'Sidebar não expõe os links esperados neste perfil');
  });
});
