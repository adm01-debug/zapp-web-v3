import { describe, it, expect } from 'vitest';
import {
  POLL_INTERVAL_MS,
  getSidebarDedupeOptions,
  getInitialDedupeOptions,
  getPollDedupeOptions,
  getOlderDedupeOptions,
  snapshotInboxDedupeConfig,
} from '@/lib/inbox/inboxDedupeConfig';

describe('inboxDedupeConfig', () => {
  it('poll resultTtl fica abaixo do POLL_INTERVAL para o ciclo seguinte revalidar', () => {
    const poll = getPollDedupeOptions();
    expect(poll.resultTtl).toBeLessThan(POLL_INTERVAL_MS);
    expect(poll.lockTtl).toBeLessThanOrEqual(POLL_INTERVAL_MS);
    // Poll intencionalmente sem retry — próximo ciclo é o retry natural.
    expect(poll.retry).toBeUndefined();
  });

  it('sidebar resultTtl < POLL_INTERVAL para refletir novas mensagens', () => {
    const s = getSidebarDedupeOptions();
    expect(s.resultTtl).toBeLessThan(POLL_INTERVAL_MS);
    expect(s.retry?.maxRetries).toBeGreaterThan(0);
  });

  it('initial e older retentam (user-facing) e respeitam waitTimeout < lockTtl', () => {
    for (const opts of [getInitialDedupeOptions(), getOlderDedupeOptions()]) {
      expect(opts.retry?.maxRetries).toBeGreaterThan(0);
      expect(opts.waitTimeout!).toBeLessThanOrEqual(opts.lockTtl!);
    }
  });

  it('older aceita shouldRetry custom para honrar AbortController', () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const opts = getOlderDedupeOptions({ shouldRetry: () => !ctrl.signal.aborted });
    expect(opts.retry?.shouldRetry?.(new Error('x'), 0)).toBe(false);
  });

  it('snapshot devolve a config completa para diagnóstico', () => {
    const snap = snapshotInboxDedupeConfig();
    expect(snap.pollIntervalMs).toBe(POLL_INTERVAL_MS);
    expect(snap.sidebar.resultTtl).toBe(getSidebarDedupeOptions().resultTtl);
    expect(snap.pageSizes.conversationPageSize).toBeGreaterThan(0);
  });
});
