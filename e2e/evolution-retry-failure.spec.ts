/**
 * E2E — Falhas intermitentes da Evolution API.
 *
 * Garante o contrato de resiliência do envio:
 *  1. Toda chamada `/message/sendText` falhar (503) → após esgotar retries do
 *     wrapper (`evolutionSendRetry`), a mensagem aparece como `failed` na UI.
 *  2. As primeiras N tentativas falharem mas a Evolution se recuperar antes do
 *     limite → a mensagem NÃO pode ser marcada como `failed`.
 *
 * Mocka somente o endpoint de envio — o restante do app (auth, realtime, listagem)
 * roda contra o backend real.
 */
import { test, expect } from './fixtures/auth';
import { MOCK_EVOLUTION_SEND_RESPONSE, TEST_PHONE } from './fixtures/test-data';
import { cleanupTestData } from './utils/supabase';

const SEND_GLOB = '**/functions/v1/evolution-api/**';

function isSendUrl(url: string) {
  return /sendText|sendMedia|\/message\//i.test(url);
}

test.describe('Falhas intermitentes da Evolution', () => {
  test.afterAll(async () => { await cleanupTestData(); });

  test('marca mensagem como falha SOMENTE após esgotar retries (Evolution offline 100%)', async ({ authenticatedPage: page }) => {
    let sendAttempts = 0;

    // Toda chamada de envio devolve 503 — força esgotar retries do wrapper.
    await page.route(SEND_GLOB, async (route) => {
      const url = route.request().url();
      if (isSendUrl(url)) {
        sendAttempts += 1;
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'unavailable', message: 'evolution down' }),
        });
      }
      return route.continue();
    });

    await page.goto('/');

    const newConv = page.getByRole('button', { name: /nova conversa|new conversation/i }).first();
    if (!(await newConv.isVisible().catch(() => false))) {
      test.skip(true, 'Botão Nova Conversa não disponível neste perfil');
    }
    await newConv.click();
    await page.getByRole('button', { name: /novo contato/i }).click();
    await page.getByLabel(/telefone/i).fill(TEST_PHONE);

    const text = `falha-intermitente-${Date.now()}`;
    await page.getByPlaceholder(/digite a primeira mensagem/i).fill(text);
    await page.getByRole('button', { name: /enviar/i }).last().click();

    // Bolha otimista deve aparecer imediatamente
    const bubble = page.getByText(text).first();
    await expect(bubble).toBeVisible({ timeout: 2_000 });

    // Durante os retries (≈ 1 + 2 = 3s) NÃO pode estar `failed` ainda
    await page.waitForTimeout(800);
    const earlyFailed = await page
      .getByRole('img', { name: /falha|failed/i })
      .first()
      .isVisible()
      .catch(() => false);
    expect(earlyFailed, 'mensagem marcada como falha antes de esgotar retries').toBe(false);

    // Aguarda o wrapper esgotar (3 attempts default) — janela generosa para CI
    await expect
      .poll(async () => {
        // status badge OU ícone de erro perto da bolha
        const statusBadge = page.locator('[data-status="failed"], [aria-label*="falha" i], [aria-label*="failed" i]');
        return await statusBadge.first().isVisible().catch(() => false);
      }, { timeout: 15_000, message: 'mensagem nunca foi marcada como failed após esgotar retries' })
      .toBe(true);

    // Confirma que o cliente realmente tentou múltiplas vezes
    expect(sendAttempts, 'wrapper de retry deveria ter feito >= 2 tentativas').toBeGreaterThanOrEqual(2);
  });

  test('NÃO marca como falha quando Evolution se recupera durante retries', async ({ authenticatedPage: page }) => {
    let sendAttempts = 0;
    const FAIL_FIRST_N = 1; // primeira tentativa 503, segunda já volta 200

    await page.route(SEND_GLOB, async (route) => {
      const url = route.request().url();
      if (!isSendUrl(url)) return route.continue();
      sendAttempts += 1;
      if (sendAttempts <= FAIL_FIRST_N) {
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'unavailable' }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_EVOLUTION_SEND_RESPONSE),
      });
    });

    await page.goto('/');
    const newConv = page.getByRole('button', { name: /nova conversa|new conversation/i }).first();
    if (!(await newConv.isVisible().catch(() => false))) {
      test.skip(true, 'Botão Nova Conversa não disponível neste perfil');
    }
    await newConv.click();
    await page.getByRole('button', { name: /novo contato/i }).click();
    await page.getByLabel(/telefone/i).fill(TEST_PHONE);

    const text = `recuperado-${Date.now()}`;
    await page.getByPlaceholder(/digite a primeira mensagem/i).fill(text);
    await page.getByRole('button', { name: /enviar/i }).last().click();

    // Bolha aparece otimista
    await expect(page.getByText(text).first()).toBeVisible({ timeout: 2_000 });

    // Após retry bem-sucedido a mensagem NÃO pode estar como failed
    await page.waitForTimeout(4_000); // > base backoff (1s) + margem
    const failedVisible = await page
      .locator('[data-status="failed"], [aria-label*="falha" i], [aria-label*="failed" i]')
      .first()
      .isVisible()
      .catch(() => false);
    expect(failedVisible, 'mensagem foi marcada como failed mesmo com retry bem-sucedido').toBe(false);

    expect(sendAttempts).toBeGreaterThanOrEqual(FAIL_FIRST_N + 1);
  });
});
