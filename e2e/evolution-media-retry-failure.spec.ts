/**
 * E2E — Falhas intermitentes da Evolution API em envios de MÍDIA (sendMedia).
 *
 * Espelha o contrato de resiliência já validado para sendText, mas focado no
 * caminho `/message/sendMedia*` (image/video/document/audio):
 *
 *  1. 100% de falha 503 no proxy → mensagem deve aparecer como `failed` na UI
 *     SOMENTE depois que o wrapper esgotar o número máximo de retries.
 *     Durante a janela de retry, a UI NÃO pode mostrar erro prematuramente.
 *
 *  2. Recuperação intermitente → 1ª tentativa falha (503), 2ª devolve 200.
 *     A mídia NÃO pode ser marcada como `failed` em nenhum momento.
 *
 * Mocka apenas o endpoint de envio. Auth, listagem e demais APIs rodam
 * contra o backend real (anon).
 */
import { test, expect, type Route } from '@playwright/test';
import { test as authTest } from './fixtures/auth';
import { MOCK_EVOLUTION_SEND_RESPONSE, TEST_PHONE } from './fixtures/test-data';
import { cleanupTestData } from './utils/supabase';

const SEND_GLOB = '**/functions/v1/evolution-api/**';

function isMediaSendUrl(url: string): boolean {
  return /\/message\/(sendMedia|sendImage|sendVideo|sendDocument|sendFile|sendAudio|sendWhatsAppAudio)/i.test(
    url,
  );
}

function isAnySendUrl(url: string): boolean {
  return /\/message\//i.test(url);
}

/**
 * PNG 1x1 transparente (67 bytes). Evita depender do filesystem do CI.
 * Mesma técnica que usamos em outros testes que precisam anexar imagem.
 */
const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function tinyPngBuffer(): Buffer {
  return Buffer.from(TINY_PNG_BASE64, 'base64');
}

/**
 * Anexa arquivo via FileChooser nativo — funciona mesmo quando o botão de
 * upload está atrás de um menu/popover. Procura qualquer `<input type=file>`
 * na página (FileUploader sempre renderiza um, hidden ou não).
 */
async function attachTinyImage(
  page: import('@playwright/test').Page,
  filename = 'e2e-media.png',
): Promise<void> {
  const fileInput = page.locator('input[type="file"]').first();
  await expect(fileInput, 'nenhum <input type=file> encontrado para anexar mídia').toHaveCount(1, {
    timeout: 5_000,
  });
  await fileInput.setInputFiles({
    name: filename,
    mimeType: 'image/png',
    buffer: tinyPngBuffer(),
  });
}

async function openNewConversation(page: import('@playwright/test').Page): Promise<void> {
  const newConv = page.getByRole('button', { name: /nova conversa|new conversation/i }).first();
  if (!(await newConv.isVisible().catch(() => false))) {
    test.skip(true, 'Botão Nova Conversa indisponível neste perfil');
  }
  await newConv.click();
  await page.getByRole('button', { name: /novo contato/i }).click();
  await page.getByLabel(/telefone/i).fill(TEST_PHONE);
}

test.describe('Falhas intermitentes da Evolution — mídia (sendMedia)', () => {
  test.afterAll(async () => {
    await cleanupTestData();
  });

  authTest(
    'marca mídia como falha SOMENTE após esgotar retries (Evolution offline 100%)',
    async ({ authenticatedPage: page }) => {
      let mediaAttempts = 0;

      // Toda chamada de envio (qualquer /message/*) devolve 503. Contamos
      // apenas as de mídia para asserts; mas mockamos tudo para garantir
      // que nem o sendText de fallback teria sucesso silencioso.
      await page.route(SEND_GLOB, async (route: Route) => {
        const url = route.request().url();
        if (!isAnySendUrl(url)) return route.continue();
        if (isMediaSendUrl(url)) mediaAttempts += 1;
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'unavailable', message: 'evolution down' }),
        });
      });

      await page.goto('/');
      await openNewConversation(page);
      await attachTinyImage(page, `falha-media-${Date.now()}.png`);

      // Bolha de mídia otimista deve aparecer rápido (preview local).
      const mediaBubble = page
        .locator('[data-message-type="image"], img[alt*="e2e" i], [data-testid="media-bubble"]')
        .first();
      await expect(mediaBubble).toBeVisible({ timeout: 5_000 });

      // Janela inicial dos retries: NÃO pode estar `failed` ainda.
      await page.waitForTimeout(800);
      const earlyFailed = await page
        .locator('[data-status="failed"], [aria-label*="falha" i], [aria-label*="failed" i]')
        .first()
        .isVisible()
        .catch(() => false);
      expect(earlyFailed, 'mídia marcada como falha antes de esgotar retries').toBe(false);

      // Após esgotar retries (~1s + 2s + margem) → DEVE estar failed.
      await expect
        .poll(
          async () => {
            return await page
              .locator('[data-status="failed"], [aria-label*="falha" i], [aria-label*="failed" i]')
              .first()
              .isVisible()
              .catch(() => false);
          },
          {
            timeout: 20_000,
            message: 'mídia nunca foi marcada como failed após esgotar retries',
          },
        )
        .toBe(true);

      expect(
        mediaAttempts,
        'wrapper deveria ter feito >= 2 tentativas no endpoint /message/sendMedia*',
      ).toBeGreaterThanOrEqual(2);
    },
  );

  authTest(
    'NÃO marca mídia como falha quando Evolution se recupera durante retries',
    async ({ authenticatedPage: page }) => {
      let mediaAttempts = 0;
      const FAIL_FIRST_N = 1; // 1ª tentativa 503, 2ª já volta 200

      await page.route(SEND_GLOB, async (route: Route) => {
        const url = route.request().url();
        if (!isAnySendUrl(url)) return route.continue();
        if (isMediaSendUrl(url)) {
          mediaAttempts += 1;
          if (mediaAttempts <= FAIL_FIRST_N) {
            return route.fulfill({
              status: 503,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'unavailable' }),
            });
          }
          return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...MOCK_EVOLUTION_SEND_RESPONSE,
              message: { imageMessage: { url: 'mock://image' } },
            }),
          });
        }
        // Outras chamadas (sendText etc): passa real / 200 fake.
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_EVOLUTION_SEND_RESPONSE),
        });
      });

      await page.goto('/');
      await openNewConversation(page);
      await attachTinyImage(page, `recuperada-media-${Date.now()}.png`);

      // Bolha otimista
      const mediaBubble = page
        .locator('[data-message-type="image"], img[alt*="e2e" i], [data-testid="media-bubble"]')
        .first();
      await expect(mediaBubble).toBeVisible({ timeout: 5_000 });

      // Após retry bem-sucedido a mídia NÃO pode estar como failed.
      // Janela > base backoff (1s) + margem.
      await page.waitForTimeout(4_000);
      const failedVisible = await page
        .locator('[data-status="failed"], [aria-label*="falha" i], [aria-label*="failed" i]')
        .first()
        .isVisible()
        .catch(() => false);
      expect(
        failedVisible,
        'mídia foi marcada como failed mesmo com retry bem-sucedido',
      ).toBe(false);

      expect(mediaAttempts).toBeGreaterThanOrEqual(FAIL_FIRST_N + 1);
    },
  );
});
