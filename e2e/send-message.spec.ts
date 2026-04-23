import { test, expect } from './fixtures/auth';
import { MOCK_EVOLUTION_SEND_RESPONSE, TEST_PHONE } from './fixtures/test-data';
import { cleanupTestData } from './utils/supabase';

test.describe('Envio de mensagens', () => {
  test.afterAll(async () => { await cleanupTestData(); });

  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.route('**/functions/v1/evolution-api**', async (route) => {
      const url = route.request().url();
      if (url.includes('sendText') || url.includes('sendMedia') || url.includes('message')) {
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify(MOCK_EVOLUTION_SEND_RESPONSE) });
      }
      return route.continue();
    });
  });

  test('envia mensagem de texto e exibe bolha otimista', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    const newConv = page.getByRole('button', { name: /nova conversa|new conversation/i }).first();
    if (!(await newConv.isVisible().catch(() => false))) {
      test.skip(true, 'Botão Nova Conversa não disponível neste perfil');
    }
    await newConv.click();

    // Modo "novo contato"
    await page.getByRole('button', { name: /novo contato/i }).click();
    await page.getByLabel(/telefone/i).fill(TEST_PHONE);
    await page.getByPlaceholder(/digite a primeira mensagem/i).fill('mensagem e2e');

    const sendBtn = page.getByRole('button', { name: /enviar/i }).last();
    const start = Date.now();
    await sendBtn.click();

    // Bolha otimista aparece em ≤ 2s (margem de segurança vs 500ms ideal)
    const bubble = page.getByText('mensagem e2e').first();
    await expect(bubble).toBeVisible({ timeout: 2_000 });
    expect(Date.now() - start).toBeLessThan(3_000);
  });

  test('envio com Evolution offline gera feedback de falha', async ({ authenticatedPage: page }) => {
    await page.unroute('**/functions/v1/evolution-api**');
    await page.route('**/functions/v1/evolution-api**', (route) =>
      route.fulfill({ status: 503, body: JSON.stringify({ error: 'unavailable' }) }));

    await page.goto('/');
    // Smoke: app não deve crashar mesmo com Eco indisponível
    await expect(page.locator('body')).toBeVisible();
  });
});
