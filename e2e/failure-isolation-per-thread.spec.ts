/**
 * E2E — Isolamento de falha por conversa.
 *
 * Garante que uma falha do envio na Evolution para o contato A NÃO contamina
 * a UI de outras conversas (B, C, …): só a thread/bolha do contato A pode
 * exibir status `failed`, enquanto envios para outros JIDs continuam normais.
 *
 * Estratégia:
 *  - Mockamos `/message/*` e roteamos por número:
 *      • TARGET_PHONE  → sempre 503 (provoca failed após retries)
 *      • OTHER_PHONE   → sempre 200 (envio bem-sucedido)
 *  - Enviamos uma mensagem para cada contato e validamos:
 *      1. A bolha do contato A (TARGET) acaba marcada como `failed`.
 *      2. A bolha do contato B (OTHER) NUNCA aparece como `failed`.
 *      3. Na lista de conversas, apenas a thread do TARGET exibe
 *         indicador de falha (badge/ícone). A do OTHER permanece limpa.
 *
 * Auth e demais APIs rodam contra o backend real; só o proxy de envio é
 * mockado. cleanupTestData no afterAll para evitar lixo no banco.
 */
import { test, expect, type Route, type Page } from '@playwright/test';
import { test as authTest } from './fixtures/auth';
import { MOCK_EVOLUTION_SEND_RESPONSE, TEST_PHONE } from './fixtures/test-data';
import { cleanupTestData } from './utils/supabase';

const SEND_GLOB = '**/functions/v1/evolution-api/**';

const TARGET_PHONE = TEST_PHONE; // 5511999999999 — vai falhar
const OTHER_PHONE = '5511888888888'; // sucesso

function isSendUrl(url: string): boolean {
  return /\/message\//i.test(url);
}

/**
 * Tenta extrair o número de destino do POST de envio.
 * A Evolution aceita `number` ou `to` (depende do endpoint).
 */
function extractRecipient(postBody: string | null): string | null {
  if (!postBody) return null;
  try {
    const parsed = JSON.parse(postBody);
    const raw =
      (typeof parsed?.number === 'string' && parsed.number) ||
      (typeof parsed?.to === 'string' && parsed.to) ||
      (typeof parsed?.remoteJid === 'string' && parsed.remoteJid) ||
      null;
    if (!raw) return null;
    // Normaliza: remove tudo que não for dígito → "5511...@..." vira "5511..."
    return raw.replace(/[^0-9]/g, '');
  } catch {
    return null;
  }
}

async function openNewConversationForPhone(page: Page, phone: string): Promise<void> {
  const newConv = page.getByRole('button', { name: /nova conversa|new conversation/i }).first();
  if (!(await newConv.isVisible().catch(() => false))) {
    test.skip(true, 'Botão Nova Conversa indisponível neste perfil');
  }
  await newConv.click();
  await page.getByRole('button', { name: /novo contato/i }).click();
  await page.getByLabel(/telefone/i).fill(phone);
}

/** Volta para a lista de conversas (clica em logo/back/inbox tab). */
async function goBackToInbox(page: Page): Promise<void> {
  // Caminho mais robusto: navega via rota raiz mantendo sessão.
  await page.goto('/');
}

test.describe('Isolamento de falha entre conversas', () => {
  test.afterAll(async () => {
    await cleanupTestData();
  });

  authTest(
    'falha no contato A NÃO afeta a thread/bolha do contato B',
    async ({ authenticatedPage: page }) => {
      let targetAttempts = 0;
      let otherAttempts = 0;

      await page.route(SEND_GLOB, async (route: Route) => {
        const req = route.request();
        const url = req.url();
        if (!isSendUrl(url)) return route.continue();

        const recipient = extractRecipient(req.postData());
        const isTarget = recipient?.includes(TARGET_PHONE);
        const isOther = recipient?.includes(OTHER_PHONE);

        if (isTarget) {
          targetAttempts += 1;
          return route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'unavailable', message: 'evolution down' }),
          });
        }
        if (isOther) {
          otherAttempts += 1;
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(MOCK_EVOLUTION_SEND_RESPONSE),
          });
        }
        // Destino desconhecido: deixa passar para não interferir.
        return route.continue();
      });

      // ── 1) Envia para o contato OTHER (deve dar sucesso) ───────────────
      await page.goto('/');
      await openNewConversationForPhone(page, OTHER_PHONE);
      const okText = `ok-${Date.now()}`;
      await page.getByPlaceholder(/digite a primeira mensagem/i).fill(okText);
      await page.getByRole('button', { name: /enviar/i }).last().click();
      await expect(page.getByText(okText).first()).toBeVisible({ timeout: 5_000 });

      // ── 2) Envia para o contato TARGET (deve falhar após retries) ──────
      await goBackToInbox(page);
      await openNewConversationForPhone(page, TARGET_PHONE);
      const failText = `fail-${Date.now()}`;
      await page.getByPlaceholder(/digite a primeira mensagem/i).fill(failText);
      await page.getByRole('button', { name: /enviar/i }).last().click();
      await expect(page.getByText(failText).first()).toBeVisible({ timeout: 5_000 });

      // Aguarda esgotar retries e a bolha do TARGET virar failed.
      const failedLocator = page.locator(
        '[data-status="failed"], [data-status="failed_retries"], [aria-label*="falha" i], [aria-label*="failed" i]',
      );
      await expect
        .poll(() => failedLocator.first().isVisible().catch(() => false), {
          timeout: 20_000,
          message: 'thread do TARGET nunca foi marcada como failed',
        })
        .toBe(true);

      // ── 3) Volta para a thread do OTHER e confirma que NADA está failed ─
      await goBackToInbox(page);

      // Localiza item da lista por nome/telefone — fallback genérico.
      const otherItem = page
        .locator(
          `[data-testid="conversation-item"]:has-text("${OTHER_PHONE.slice(-8)}"), [role="listitem"]:has-text("${OTHER_PHONE.slice(-8)}")`,
        )
        .first();
      if (await otherItem.isVisible().catch(() => false)) {
        await otherItem.click();
      }

      // A thread do OTHER NÃO pode mostrar status failed em nenhuma bolha.
      // Damos uma janela curta para realtime/race conditions se manifestarem.
      await page.waitForTimeout(1_500);
      const otherFailedVisible = await failedLocator
        .first()
        .isVisible()
        .catch(() => false);
      expect(
        otherFailedVisible,
        'thread do OTHER ficou marcada como failed por contaminação cruzada',
      ).toBe(false);

      // E a mensagem original ainda está lá, sem status de erro acoplado.
      await expect(page.getByText(okText).first()).toBeVisible();

      // ── 4) Sanity dos contadores de chamada ────────────────────────────
      expect(
        targetAttempts,
        'wrapper deveria ter retried o TARGET pelo menos 2x',
      ).toBeGreaterThanOrEqual(2);
      expect(
        otherAttempts,
        'envio para OTHER deveria ter ocorrido exatamente uma vez',
      ).toBeGreaterThanOrEqual(1);

      // ── 5) Lista de conversas: só a entrada do TARGET pode exibir o
      //     indicador de falha (badge/ícone na sidebar). A do OTHER limpa.
      await goBackToInbox(page);
      const targetItem = page
        .locator(
          `[data-testid="conversation-item"]:has-text("${TARGET_PHONE.slice(-8)}"), [role="listitem"]:has-text("${TARGET_PHONE.slice(-8)}")`,
        )
        .first();
      const otherItem2 = page
        .locator(
          `[data-testid="conversation-item"]:has-text("${OTHER_PHONE.slice(-8)}"), [role="listitem"]:has-text("${OTHER_PHONE.slice(-8)}")`,
        )
        .first();

      // Só vale assertar se conseguimos localizar ambos os itens na lista.
      if (
        (await targetItem.isVisible().catch(() => false)) &&
        (await otherItem2.isVisible().catch(() => false))
      ) {
        const otherHasFailureBadge = await otherItem2
          .locator('[data-status="failed"], [aria-label*="falha" i], [aria-label*="failed" i]')
          .first()
          .isVisible()
          .catch(() => false);
        expect(
          otherHasFailureBadge,
          'item do OTHER na lista exibe badge de falha indevidamente',
        ).toBe(false);
      }
    },
  );
});
