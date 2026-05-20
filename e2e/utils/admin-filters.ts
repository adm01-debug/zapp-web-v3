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
  // Filtros (controles)
  eventType: (page: Page) => page.getByTestId('filter-webhook-event-type'),
  instance: (page: Page) => page.getByTestId('filter-webhook-instance'),
  remoteJid: (page: Page) => page.getByTestId('filter-webhook-remote-jid'),
  pushName: (page: Page) => page.getByTestId('filter-webhook-push-name'),
  messageType: (page: Page) => page.getByTestId('filter-webhook-message-type'),
  status: (page: Page) => page.getByTestId('filter-webhook-status'),
  search: (page: Page) => page.getByTestId('filter-webhook-search'),
  clear: (page: Page) => page.getByTestId('filter-webhook-clear'),
  // Resultados
  resultsCount: (page: Page) => page.getByTestId('webhook-events-results-count'),
  rows: (page: Page) => page.getByTestId('webhook-event-row'),
  // Células de cada linha (escopadas a uma linha via .locator)
  cell: {
    createdAt: 'webhook-event-created-at',
    eventType: 'webhook-event-event-type',
    instance: 'webhook-event-instance',
    jid: 'webhook-event-jid',
    pushName: 'webhook-event-push-name',
    status: 'webhook-event-status',
    detailsButton: 'webhook-event-details-button',
  } as const,
};

// ============================================================
// Página de Failed Messages
// ============================================================

export const failedFilters = {
  // Filtros (controles)
  search: (page: Page) => page.getByTestId('filter-failed-search'),
  /**
   * Não existe um campo dedicado para `remote_jid` nesta página: o input
   * de busca aceita JID, código de erro e mensagem. Mantemos o alias para
   * compatibilidade com o pattern dos specs de interseção, mas filtrar por
   * JID aqui = preencher o `search`.
   */
  remoteJid: (page: Page) => page.getByTestId('filter-failed-search'),
  status: (page: Page) => page.getByTestId('filter-failed-status'),
  hours: (page: Page) => page.getByTestId('filter-failed-hours'),
  from: (page: Page) => page.getByTestId('filter-failed-from'),
  to: (page: Page) => page.getByTestId('filter-failed-to'),
  clearDates: (page: Page) => page.getByTestId('filter-failed-clear-dates'),
  instance: (page: Page) => page.getByTestId('filter-failed-instance'),
  rootCause: (page: Page) => page.getByTestId('filter-failed-root-cause'),
  errorCode: (page: Page) => page.getByTestId('filter-failed-error-code'),
  // Resultados
  resultsCount: (page: Page) => page.getByTestId('failed-messages-results-count'),
  rows: (page: Page) => page.getByTestId('failed-message-row'),
  // Células de cada linha
  cell: {
    selectCheckbox: 'failed-message-select-checkbox',
    status: 'failed-message-status',
    instance: 'failed-message-instance',
    jid: 'failed-message-jid',
    error: 'failed-message-error',
    rootCause: 'failed-message-root-cause',
    errorCode: 'failed-message-error-code',
    errorMessage: 'failed-message-error-message',
    retryCount: 'failed-message-retry-count',
    lastAttempt: 'failed-message-last-attempt',
    nextAttempt: 'failed-message-next-attempt',
    createdAt: 'failed-message-created-at',
    detailsButton: 'failed-message-details-button',
    retryButton: 'failed-message-retry-button',
    abandonButton: 'failed-message-abandon-button',
  } as const,
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

// ============================================================
// Leitura de atributos por linha (para asserts de interseção)
// ============================================================

/**
 * Lê todos os valores de um `data-*` em todas as linhas de um locator.
 * Retorna strings vazias quando o atributo está ausente, para que o spec
 * possa decidir explicitamente se considera (ex: pular linhas sem push_name).
 */
export async function readRowAttribute(rows: Locator, attr: string): Promise<string[]> {
  const count = await rows.count();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push((await rows.nth(i).getAttribute(attr)) ?? '');
  }
  return out;
}

/**
 * Lê N atributos em paralelo por linha — preserva o índice de cada linha.
 * Útil para asserts de interseção combinada (ex: jid+push_name por linha).
 */
export async function readRowAttributes(
  rows: Locator,
  attrs: readonly string[],
): Promise<Array<Record<string, string>>> {
  const count = await rows.count();
  const out: Array<Record<string, string>> = [];
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const entry: Record<string, string> = {};
    for (const a of attrs) {
      entry[a] = (await row.getAttribute(a)) ?? '';
    }
    out.push(entry);
  }
  return out;
}
