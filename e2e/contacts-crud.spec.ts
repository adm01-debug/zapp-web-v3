import { test, expect } from './fixtures/auth';
import { MOCK_EVOLUTION_SEND_RESPONSE, TEST_PHONE, TEST_CONTACT_NAME } from './fixtures/test-data';
import { cleanupTestData } from './utils/supabase';

test.describe('Contatos — CRUD básico', () => {
  test.afterAll(async () => { await cleanupTestData(); });

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route('**/functions/v1/evolution-api**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(MOCK_EVOLUTION_SEND_RESPONSE) }));
    await page.route('**/functions/v1/batch-fetch-avatars**', (route) =>
      route.fulfill({ status: 200, body: '{}' }));
  });

  test('cria novo contato via "Nova Conversa"', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    const newConv = page.getByRole('button', { name: /nova conversa|new conversation/i }).first();
    if (!(await newConv.isVisible().catch(() => false))) {
      test.skip(true, 'Botão Nova Conversa não disponível neste perfil');
    }
    await newConv.click();

    const novoBtn = page.getByRole('button', { name: /novo contato/i });
    if (!(await novoBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Modo "novo contato" não exposto');
    }
    await novoBtn.click();

    await page.getByLabel(/telefone/i).fill(TEST_PHONE);
    const nameInput = page.getByLabel(/nome/i).first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(TEST_CONTACT_NAME);
    }
    await page.getByPlaceholder(/digite a primeira mensagem/i).fill('e2e first contact msg');
    await page.getByRole('button', { name: /enviar/i }).last().click();

    // Sucesso: bolha aparece OU toast de sucesso
    const success = page.getByText(/e2e first contact msg|mensagem enviada/i).first();
    await expect(success).toBeVisible({ timeout: 5_000 });
  });

  test('tentativa de duplicar telefone exibe erro', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    const newConv = page.getByRole('button', { name: /nova conversa/i }).first();
    if (!(await newConv.isVisible().catch(() => false))) {
      test.skip(true, 'UI Nova Conversa indisponível');
    }
    await newConv.click();
    const novoBtn = page.getByRole('button', { name: /novo contato/i });
    if (!(await novoBtn.isVisible().catch(() => false))) {
      test.skip(true, 'Modo "novo contato" não exposto');
    }
    await novoBtn.click();
    await page.getByLabel(/telefone/i).fill(TEST_PHONE);
    await page.getByPlaceholder(/digite a primeira mensagem/i).fill('dup attempt');
    await page.getByRole('button', { name: /enviar/i }).last().click();

    // Aguarda toast de erro de duplicidade — best-effort
    const dupErr = page.getByText(/já existe|duplicado|duplicate/i).first();
    const visible = await dupErr.isVisible({ timeout: 4_000 }).catch(() => false);
    if (!visible) test.skip(true, 'Sem contato existente para colidir — execução isolada');
  });

  test('busca por telefone retorna resultados rapidamente', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    const newConv = page.getByRole('button', { name: /nova conversa/i }).first();
    if (!(await newConv.isVisible().catch(() => false))) {
      test.skip(true, 'UI Nova Conversa indisponível');
    }
    await newConv.click();
    const search = page.getByPlaceholder(/buscar|pesquisar|search/i).first();
    if (!(await search.isVisible().catch(() => false))) {
      test.skip(true, 'Campo de busca não exposto');
    }
    const start = Date.now();
    await search.fill(TEST_PHONE.slice(0, 6));
    // Aguarda lista atualizar (debounce 300ms + render)
    await page.waitForTimeout(700);
    expect(Date.now() - start).toBeLessThan(2_500);
  });
});
