/**
 * Helpers para os specs E2E dos painéis admin de filtros
 * (AdminWebhookEventsPage e AdminFailedMessagesPage).
 *
 * Estes helpers se baseiam exclusivamente em `data-testid`s adicionados
 * aos painéis e não dependem de copy/CSS específicos.
 */
import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

// ============================================================
// Página de Webhook Events
// ============================================================

export const webhookFilters = {
  remoteJid: (page: Page) => page.getByTestId('filter-webhook-remote-jid'),
  pushName: (page: Page) => page.getByTestId('filter-webhook-push-name'),
  messageType: (page: Page) => page.getByTestId('filter-webhook-message-type'),
  status: (page: Page) => page.getByTestId('filter-webhook-status'),
  search: (page: Page) => page.getByTestId('filter-webhook-search'),
  clear: (page: Page) => page.getByTestId('filter-webhook-clear'),
  resultsCount: (page: Page) => page.getByTestId('webhook-events-results-count'),
  rows: (page: Page) => page.getByTestId('webhook-event-row'),
};

// ============================================================
// Página de Failed Messages
// ============================================================

export const failedFilters = {
  remoteJid: (page: Page) => page.getByTestId('filter-failed-remote-jid'),
  status: (page: Page) => page.getByTestId('filter-failed-status'),
  search: (page: Page) => page.getByTestId('filter-failed-search'),
  resultsCount: (page: Page) => page.getByTestId('failed-messages-results-count'),
  rows: (page: Page) => page.getByTestId('failed-message-row'),
};

// ============================================================
// Utilitários
// ============================================================

/**
 * Lê o número total de resultados a partir do elemento `data-testid`.
 * Aceita tanto `data-results-count="N"` (preferido) quanto fallback para
 * o `textContent` numérico.
 */
export async function readResultsCount(locator: Locator): Promise<number> {
  const attr = await locator.getAttribute('data-results-count');
  if (attr !== null && attr !== '') {
    const n = Number(attr);
    if (!Number.isNaN(n)) return n;
  }
  const text = (await locator.textContent()) ?? '';
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

/**
 * Aguarda a UI estabilizar após mudança de filtro (refetch + render).
 */
export async function waitForFiltersSettled(page: Page) {
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
}

/**
 * Helper para selecionar valor em um <Select> shadcn via combobox.
 * Os triggers expostos via `data-testid` são clicáveis e abrem o popover;
 * cada opção é selecionada via role.
 */
export async function selectOption(trigger: Locator, optionLabel: string | RegExp) {
  await trigger.click();
  const page = trigger.page();
  await page.getByRole('option', { name: optionLabel }).first().click();
}

/**
 * Verifica se o usuário corrente tem acesso à rota admin. Se a navegação
 * resultar em /auth ou /403, marca o teste como skip.
 */
export async function ensureAdminRouteOrSkip(page: Page, path: string): Promise<boolean> {
  const response = await page.goto(path);
  // Se foi redirecionado para auth ou recebeu 403, o bot não é admin.
  const url = page.url();
  if (/\/auth(\?|$)/.test(url) || /\/403(\?|$)/.test(url)) return false;
  if (response && response.status() >= 400) return false;
  return true;
}
