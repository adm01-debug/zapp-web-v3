/**
 * E2E — Asserts de interseção EXATA dos filtros admin.
 *
 * Diferente das suítes de ortogonalidade (`admin-webhook-filters.spec.ts` e
 * `admin-failed-messages-filters.spec.ts`), este spec valida que cada linha
 * retornada satisfaz SIMULTANEAMENTE TODOS os filtros aplicados — não só um
 * subset deles. Para isso:
 *
 * 1. Pega o conjunto inicial e escolhe valores reais (jid + push_name +
 *    message_type + status) presentes no dataset visível.
 * 2. Aplica a combinação de filtros e re-lê os atributos de cada linha
 *    (`data-remote-jid`, `data-push-name`, `data-message-type`, `data-status`).
 * 3. Verifica:
 *      - count(linhas) === results-count exposto no header;
 *      - todas as linhas casam com OS DOIS critérios da combinação;
 *      - count <= baseline (interseção nunca aumenta o conjunto).
 *
 * Sem seed — se não houver dado real para escolher um par válido,
 * o teste é marcado como skip.
 */
import { test, expect } from './fixtures/auth';
import {
  webhookFilters,
  failedFilters,
  readResultsCount,
  readRowAttributes,
  waitForFiltersSettled,
  selectOption,
  ensureAdminRouteOrSkip,
} from './utils/admin-filters';

const WEBHOOK_PATH = '/admin/webhook-events';
const FAILED_PATH = '/admin/failed-messages';

// ============================================================
// Webhook events
// ============================================================

test.describe('Admin · Webhook Events · interseção exata', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const ok = await ensureAdminRouteOrSkip(authenticatedPage, WEBHOOK_PATH);
    test.skip(!ok, 'Bot E2E não é admin — pulando suite de filtros admin.');
    await waitForFiltersSettled(authenticatedPage);
    await expect(webhookFilters.resultsCount(authenticatedPage)).toBeVisible({ timeout: 15_000 });
  });

  test('remote_jid + push_name: cada linha satisfaz AMBOS os critérios', async ({
    authenticatedPage: page,
  }) => {
    const rows = webhookFilters.rows(page);
    const baselineCount = await rows.count();
    test.skip(baselineCount === 0, 'Sem dados visíveis no período padrão.');

    // Escolhe a primeira linha que tenha jid E push_name não vazios.
    const baseline = await readRowAttributes(rows, ['data-remote-jid', 'data-push-name']);
    const sample = baseline.find(
      (r) => r['data-remote-jid'].length >= 6 && r['data-push-name'].length >= 2,
    );
    test.skip(!sample, 'Nenhuma linha visível tem jid+push_name válidos para testar.');
    if (!sample) return;

    const jidFragment = sample['data-remote-jid'].slice(0, 6).toLowerCase();
    const pushFragment = sample['data-push-name'].slice(0, 3).toLowerCase();

    await webhookFilters.remoteJid(page).fill(jidFragment);
    await webhookFilters.pushName(page).fill(pushFragment);
    await waitForFiltersSettled(page);

    const filteredCount = await rows.count();
    const headerCount = await readResultsCount(webhookFilters.resultsCount(page));

    // Invariante 1: contador exposto bate com nº de linhas renderizadas.
    expect(filteredCount).toBe(headerCount);
    // Invariante 2: interseção nunca aumenta o conjunto.
    expect(filteredCount).toBeLessThanOrEqual(baselineCount);
    expect(filteredCount).toBeGreaterThan(0);

    // Invariante 3: TODAS as linhas casam com os DOIS critérios.
    const filteredRows = await readRowAttributes(rows, ['data-remote-jid', 'data-push-name']);
    for (const row of filteredRows) {
      expect(row['data-remote-jid'].toLowerCase()).toContain(jidFragment);
      expect(row['data-push-name'].toLowerCase()).toContain(pushFragment);
    }
  });

  test('message_type + status: cada linha satisfaz AMBOS os critérios', async ({
    authenticatedPage: page,
  }) => {
    const rows = webhookFilters.rows(page);
    const baselineCount = await rows.count();
    test.skip(baselineCount === 0, 'Sem dados visíveis no período padrão.');

    // Escolhe um message_type real presente no dataset (ignora vazios).
    const baseline = await readRowAttributes(rows, ['data-message-type', 'data-status']);
    const sample = baseline.find(
      (r) => r['data-message-type'].length > 0 && r['data-status'] === 'processed',
    );
    test.skip(
      !sample,
      'Nenhuma linha "processed" com message_type definido no período padrão.',
    );
    if (!sample) return;

    const targetType = sample['data-message-type'];

    await selectOption(webhookFilters.messageType(page), new RegExp(`^${targetType}$`, 'i'));
    await selectOption(webhookFilters.status(page), /Processados/i);
    await waitForFiltersSettled(page);

    const filteredCount = await rows.count();
    const headerCount = await readResultsCount(webhookFilters.resultsCount(page));

    expect(filteredCount).toBe(headerCount);
    expect(filteredCount).toBeLessThanOrEqual(baselineCount);
    expect(filteredCount).toBeGreaterThan(0);

    const filteredRows = await readRowAttributes(rows, ['data-message-type', 'data-status']);
    for (const row of filteredRows) {
      expect(row['data-message-type']).toBe(targetType);
      expect(row['data-status']).toBe('processed');
    }
  });
});

// ============================================================
// Failed messages — message_type não existe; usamos remote_jid + status
// ============================================================

test.describe('Admin · Failed Messages · interseção exata', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const ok = await ensureAdminRouteOrSkip(authenticatedPage, FAILED_PATH);
    test.skip(!ok, 'Bot E2E não é admin — pulando suite de filtros admin.');
    await waitForFiltersSettled(authenticatedPage);
    await expect(failedFilters.resultsCount(authenticatedPage)).toBeVisible({ timeout: 15_000 });
  });

  test('remote_jid + status: cada linha satisfaz AMBOS os critérios', async ({
    authenticatedPage: page,
  }) => {
    const rows = failedFilters.rows(page);
    const baselineCount = await rows.count();
    test.skip(baselineCount === 0, 'Sem failed_messages visíveis.');

    const baseline = await readRowAttributes(rows, ['data-remote-jid', 'data-status']);
    const sample = baseline.find((r) => r['data-remote-jid'].length >= 6 && r['data-status'].length > 0);
    test.skip(!sample, 'Nenhuma linha com jid+status válidos para testar.');
    if (!sample) return;

    const jidFragment = sample['data-remote-jid'].slice(0, 6).toLowerCase();
    const targetStatus = sample['data-status'];

    await failedFilters.remoteJid(page).fill(jidFragment);
    await selectOption(failedFilters.status(page), new RegExp(targetStatus, 'i'));
    await waitForFiltersSettled(page);

    const filteredCount = await rows.count();
    const headerCount = await readResultsCount(failedFilters.resultsCount(page));

    expect(filteredCount).toBe(headerCount);
    expect(filteredCount).toBeLessThanOrEqual(baselineCount);
    expect(filteredCount).toBeGreaterThan(0);

    const filteredRows = await readRowAttributes(rows, ['data-remote-jid', 'data-status']);
    for (const row of filteredRows) {
      expect(row['data-remote-jid'].toLowerCase()).toContain(jidFragment);
      expect(row['data-status']).toBe(targetStatus);
    }
  });
});
