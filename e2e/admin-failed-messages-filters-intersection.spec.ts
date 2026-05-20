/**
 * E2E — Asserts de interseção EXATA dos filtros em /admin/failed-messages.
 *
 * Diferente da suíte de ortogonalidade (`admin-failed-messages-filters.spec.ts`),
 * este spec valida que cada linha retornada satisfaz SIMULTANEAMENTE TODOS
 * os filtros aplicados.
 *
 * A página de failed_messages não expõe filtro de `message_type`, então a
 * combinação testada é `remote_jid (via search) + status`. As invariantes
 * são compartilhadas com a suíte de webhook events através do helper
 * `assertIntersectionInvariants`.
 */
import { test, expect } from './fixtures/auth';
import {
  failedFilters,
  waitForFiltersSettled,
  selectOption,
  ensureAdminRouteOrSkip,
} from './utils/admin-filters';
import { assertIntersectionInvariants, pickSample } from './utils/intersection';

const ADMIN_PATH = '/admin/failed-messages';

test.describe('Admin · Failed Messages · interseção exata', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    const ok = await ensureAdminRouteOrSkip(authenticatedPage, ADMIN_PATH);
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

    const sample = await pickSample(
      rows,
      ['data-remote-jid', 'data-status'],
      (r) => r['data-remote-jid'].length >= 6 && r['data-status'].length > 0,
    );
    test.skip(!sample, 'Nenhuma linha com jid+status válidos para testar.');
    if (!sample) return;

    const jidFragment = sample['data-remote-jid'].slice(0, 6).toLowerCase();
    const targetStatus = sample['data-status'];

    await failedFilters.remoteJid(page).fill(jidFragment);
    await selectOption(failedFilters.status(page), new RegExp(targetStatus, 'i'));
    await waitForFiltersSettled(page);

    await assertIntersectionInvariants({
      rows,
      resultsCount: failedFilters.resultsCount(page),
      baselineCount,
      attributes: ['data-remote-jid', 'data-status'],
      predicates: [
        (row) => expect(row['data-remote-jid'].toLowerCase()).toContain(jidFragment),
        (row) => expect(row['data-status']).toBe(targetStatus),
      ],
    });
  });
});
