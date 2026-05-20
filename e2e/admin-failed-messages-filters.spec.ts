/**
 * E2E — Filtros avançados em /admin/failed-messages
 *
 * Valida que filtros estruturados (status, remote_jid via search) operam
 * de forma isolada e que a busca textual respeita o filtro estrutural —
 * nunca traz linhas que ele já excluiu.
 */
import { test, expect } from './fixtures/auth';
import {
  failedFilters,
  readResultsCount,
  waitForFiltersSettled,
  selectOption,
  ensureAdminRouteOrSkip,
} from './utils/admin-filters';

const ADMIN_PATH = '/admin/failed-messages';

test.describe('Admin · Failed Messages · combinações de filtros', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const ok = await ensureAdminRouteOrSkip(authenticatedPage, ADMIN_PATH);
    test.skip(!ok, 'Bot E2E não é admin — pulando suite de filtros admin.');
    await waitForFiltersSettled(authenticatedPage);
    await expect(failedFilters.resultsCount(authenticatedPage)).toBeVisible({ timeout: 15_000 });
  });

  test('filtro por status restringe ao status escolhido', async ({ authenticatedPage: page }) => {
    const baseline = await readResultsCount(failedFilters.resultsCount(page));

    await selectOption(failedFilters.status(page), /Pendente/i);
    await waitForFiltersSettled(page);

    const filtered = await readResultsCount(failedFilters.resultsCount(page));
    expect(filtered).toBeLessThanOrEqual(baseline);

    const rows = failedFilters.rows(page);
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const status = (await rows.nth(i).locator('[data-testid="failed-message-status"]').textContent()) ?? '';
      expect(status.toLowerCase()).toContain('pendente');
    }
  });

  test('busca textual NÃO desfaz filtro de status (interseção)', async ({ authenticatedPage: page }) => {
    await selectOption(failedFilters.status(page), /Abandonado/i);
    await waitForFiltersSettled(page);
    const onlyStatus = await readResultsCount(failedFilters.resultsCount(page));

    await failedFilters.search(page).fill('zz-no-match-zz');
    // search é debounced 300ms
    await page.waitForTimeout(450);
    await waitForFiltersSettled(page);

    const withSearch = await readResultsCount(failedFilters.resultsCount(page));
    expect(withSearch).toBeLessThanOrEqual(onlyStatus);

    const rows = failedFilters.rows(page);
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const status = (await rows.nth(i).locator('[data-testid="failed-message-status"]').textContent()) ?? '';
      expect(status.toLowerCase()).toContain('abandonado');
    }
  });

  test('limpar busca preserva o filtro de status', async ({ authenticatedPage: page }) => {
    await selectOption(failedFilters.status(page), /Sucesso/i);
    await waitForFiltersSettled(page);
    const onlyStatus = await readResultsCount(failedFilters.resultsCount(page));

    await failedFilters.search(page).fill('a');
    await page.waitForTimeout(450);
    await waitForFiltersSettled(page);

    await failedFilters.search(page).fill('');
    await page.waitForTimeout(450);
    await waitForFiltersSettled(page);

    const restored = await readResultsCount(failedFilters.resultsCount(page));
    expect(restored).toBe(onlyStatus);
  });

  test('voltar status para "Todos" restaura conjunto completo', async ({ authenticatedPage: page }) => {
    const baseline = await readResultsCount(failedFilters.resultsCount(page));

    await selectOption(failedFilters.status(page), /Reprocessando/i);
    await waitForFiltersSettled(page);

    await selectOption(failedFilters.status(page), /Todos/i);
    await waitForFiltersSettled(page);

    const restored = await readResultsCount(failedFilters.resultsCount(page));
    expect(restored).toBe(baseline);
  });
});
