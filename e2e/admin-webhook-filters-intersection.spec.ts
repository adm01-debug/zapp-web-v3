/**
 * E2E — Asserts de interseção EXATA dos filtros em /admin/webhook-events.
 *
 * Diferente da suíte de ortogonalidade (`admin-webhook-filters.spec.ts`),
 * este spec valida que cada linha retornada satisfaz SIMULTANEAMENTE TODOS
 * os filtros aplicados — não só um subset deles.
 *
 * Pipeline:
 *  1. Lê o conjunto inicial e escolhe valores reais (jid + push_name,
 *     message_type + status) presentes no dataset visível.
 *  2. Aplica a combinação e re-lê os atributos de cada linha.
 *  3. Valida invariantes via `assertIntersectionInvariants` (helper
 *     compartilhado com a suíte de failed_messages).
 *
 * Sem seed — quando não há dado real para escolher um par válido,
 * o teste é marcado como skip.
 */
import { test, expect } from './fixtures/auth';
import {
  webhookFilters,
  waitForFiltersSettled,
  selectOption,
  ensureAdminRouteOrSkip,
} from './utils/admin-filters';
import { assertIntersectionInvariants, pickSample } from './utils/intersection';

const ADMIN_PATH = '/admin/webhook-events';

test.describe('Admin · Webhook Events · interseção exata', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const ok = await ensureAdminRouteOrSkip(authenticatedPage, ADMIN_PATH);
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

    const sample = await pickSample(
      rows,
      ['data-remote-jid', 'data-push-name'],
      (r) => r['data-remote-jid'].length >= 6 && r['data-push-name'].length >= 2,
    );
    test.skip(!sample, 'Nenhuma linha visível tem jid+push_name válidos para testar.');
    if (!sample) return;

    const jidFragment = sample['data-remote-jid'].slice(0, 6).toLowerCase();
    const pushFragment = sample['data-push-name'].slice(0, 3).toLowerCase();

    await webhookFilters.remoteJid(page).fill(jidFragment);
    await webhookFilters.pushName(page).fill(pushFragment);
    await waitForFiltersSettled(page);

    await assertIntersectionInvariants({
      rows,
      resultsCount: webhookFilters.resultsCount(page),
      baselineCount,
      attributes: ['data-remote-jid', 'data-push-name'],
      predicates: [
        (row) => expect(row['data-remote-jid'].toLowerCase()).toContain(jidFragment),
        (row) => expect(row['data-push-name'].toLowerCase()).toContain(pushFragment),
      ],
    });
  });

  test('message_type + status: cada linha satisfaz AMBOS os critérios', async ({
    authenticatedPage: page,
  }) => {
    const rows = webhookFilters.rows(page);
    const baselineCount = await rows.count();
    test.skip(baselineCount === 0, 'Sem dados visíveis no período padrão.');

    const sample = await pickSample(
      rows,
      ['data-message-type', 'data-status'],
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

    await assertIntersectionInvariants({
      rows,
      resultsCount: webhookFilters.resultsCount(page),
      baselineCount,
      attributes: ['data-message-type', 'data-status'],
      predicates: [
        (row) => expect(row['data-message-type']).toBe(targetType),
        (row) => expect(row['data-status']).toBe('processed'),
      ],
    });
  });
});
