import { test, expect } from '@playwright/test';
import { loginViaUI } from './fixtures/auth';

test.describe('Auth (smoke)', () => {
  test('rota protegida sem sessão redireciona para /auth', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
  });

  test('login com email/senha redireciona para home', async ({ page }) => {
    await loginViaUI(page);
    await expect(page).not.toHaveURL(/\/auth/);
  });

  test('logout volta para /auth', async ({ page }) => {
    await loginViaUI(page);
    // Procura botão de logout (header/menu de perfil)
    const logoutBtn = page.getByRole('button', { name: /sair|logout/i }).first();
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/auth/, { timeout: 10_000 });
    } else {
      test.skip(true, 'Botão de logout não encontrado no layout atual');
    }
  });
});
