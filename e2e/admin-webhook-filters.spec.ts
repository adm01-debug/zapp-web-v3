/**
 * E2E — Filtros avançados em /admin/webhook-events
 *
 * Garante que filtros estruturados (remote_jid, push_name, message_type,
 * status) operam de forma isolada e combinada, e que **a busca textual
 * não altera os resultados produzidos pelos filtros estruturados** —
 * ou seja, busca textual e filtros são ortogonais.
 *
 * Nenhum dado é semeado: os testes verificam invariantes (subset/igualdade)
 * sobre o dataset carregado pelo painel. Quando o bot E2E não tem
 * permissão de admin, os testes são marcados como skip.
 */
import { test, expect } from './fixtures/auth';
import {
  webhookFilters,
  readResultsCount,
  waitForFiltersSettled,
  selectOption,
  ensureAdminRouteOrSkip,
} from './utils/admin-filters';

const ADMIN_PATH = '/admin/webhook-events';

test.describe('Admin · Webhook Events · combinações de filtros', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const ok = await ensureAdminRouteOrSkip(authenticatedPage, ADMIN_PATH);
    test.skip(!ok, 'Bot E2E não é admin — pulando suite de filtros admin.');
    await waitForFiltersSettled(authenticatedPage);
    await expect(webhookFilters.resultsCount(authenticatedPage)).toBeVisible({ timeout: 15_000 });
  });

  test('filtro isolado por status reduz (ou mantém) o total e marca todas as linhas', async ({
    authenticatedPage: page,
  }) => {
    const baseline = await readResultsCount(webhookFilters.resultsCount(page));

    await selectOption(webhookFilters.status(page), /Processados/i);
    await waitForFiltersSettled(page);

    const filtered = await readResultsCount(webhookFilters.resultsCount(page));
    expect(filtered).toBeLessThanOrEqual(baseline);

    const visible = await webhookFilters.rows(page).count();
    if (visible > 0) {
      const statuses = await webhookFilters.rows(page).locator('[data-testid="webhook-event-status"]').allTextContents();
      for (const s of statuses) {
        expect(s.trim().toLowerCase()).toContain('processado');
      }
    }
  });

  test('filtro por remote_jid restringe linhas ao JID informado', async ({ authenticatedPage: page }) => {
    const initialCount = await webhookFilters.rows(page).count();
    test.skip(initialCount === 0, 'Sem dados de webhook visíveis no período padrão.');

    const sampleJid = await webhookFilters.rows(page)
      .first()
      .locator('[data-testid="webhook-event-jid"]')
      .textContent();
    const jidFragment = (sampleJid ?? '').replace(/\s.*$/, '').slice(0, 6);
    test.skip(jidFragment.length < 4, 'JID inválido para teste.');

    await webhookFilters.remoteJid(page).fill(jidFragment);
    await waitForFiltersSettled(page);

    const rows = webhookFilters.rows(page);
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const jid = (await rows.nth(i).locator('[data-testid="webhook-event-jid"]').textContent()) ?? '';
      expect(jid.toLowerCase()).toContain(jidFragment.toLowerCase());
    }
  });

  test('combinação remote_jid + status preserva ambas as restrições', async ({ authenticatedPage: page }) => {
    const initialCount = await webhookFilters.rows(page).count();
    test.skip(initialCount === 0, 'Sem dados visíveis.');

    const sampleJid = await webhookFilters.rows(page)
      .first()
      .locator('[data-testid="webhook-event-jid"]')
      .textContent();
    const jidFragment = (sampleJid ?? '').replace(/\s.*$/, '').slice(0, 6);
    test.skip(jidFragment.length < 4, 'JID inválido para teste.');

    await webhookFilters.remoteJid(page).fill(jidFragment);
    await selectOption(webhookFilters.status(page), /Processados/i);
    await waitForFiltersSettled(page);

    const rows = webhookFilters.rows(page);
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const jid = (await rows.nth(i).locator('[data-testid="webhook-event-jid"]').textContent()) ?? '';
      const status = (await rows.nth(i).locator('[data-testid="webhook-event-status"]').textContent()) ?? '';
      expect(jid.toLowerCase()).toContain(jidFragment.toLowerCase());
      expect(status.toLowerCase()).toContain('processado');
    }
  });

  test('busca textual NÃO libera linhas que o filtro de status excluiu', async ({ authenticatedPage: page }) => {
    await selectOption(webhookFilters.status(page), /Processados/i);
    await waitForFiltersSettled(page);
    const filteredCount = await readResultsCount(webhookFilters.resultsCount(page));

    // Aplicar busca textual qualquer (mesmo que não bata) NUNCA pode aumentar o conjunto:
    // a regra é interseção, nunca união.
    await webhookFilters.search(page).fill('zz-no-match-zz');
    await waitForFiltersSettled(page);

    const afterSearch = await readResultsCount(webhookFilters.resultsCount(page));
    expect(afterSearch).toBeLessThanOrEqual(filteredCount);

    // Toda linha visível continua sendo "Processado".
    const rows = webhookFilters.rows(page);
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      const status = (await rows.nth(i).locator('[data-testid="webhook-event-status"]').textContent()) ?? '';
      expect(status.toLowerCase()).toContain('processado');
    }
  });

  test('limpar busca preserva os filtros estruturados', async ({ authenticatedPage: page }) => {
    await selectOption(webhookFilters.status(page), /Com erro/i);
    await waitForFiltersSettled(page);
    const onlyFilters = await readResultsCount(webhookFilters.resultsCount(page));

    await webhookFilters.search(page).fill('a');
    await waitForFiltersSettled(page);

    await webhookFilters.search(page).fill('');
    await waitForFiltersSettled(page);

    const afterClearSearch = await readResultsCount(webhookFilters.resultsCount(page));
    expect(afterClearSearch).toBe(onlyFilters);
  });

  test('botão "Limpar filtros" zera todas as restrições', async ({ authenticatedPage: page }) => {
    const baseline = await readResultsCount(webhookFilters.resultsCount(page));

    await webhookFilters.remoteJid(page).fill('5511');
    await selectOption(webhookFilters.status(page), /Pendentes/i);
    await webhookFilters.search(page).fill('foo');
    await waitForFiltersSettled(page);

    if (await webhookFilters.clear(page).isVisible()) {
      await webhookFilters.clear(page).click();
      await waitForFiltersSettled(page);
      const afterClear = await readResultsCount(webhookFilters.resultsCount(page));
      expect(afterClear).toBe(baseline);
    }
  });
});
