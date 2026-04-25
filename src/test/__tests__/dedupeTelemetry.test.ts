/**
 * dedupeTelemetry — testes unitários + integração com crossTabDedupe.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordDedupeEvent,
  resetDedupeTelemetry,
  getDedupeTelemetrySnapshot,
  inferKeyKind,
  extractNamespace,
} from '@/lib/realtime/dedupeTelemetry';
import {
  dedupedFetch,
  clearCrossTabDedupe,
} from '@/lib/realtime/crossTabDedupe';

describe('dedupeTelemetry — singleton de contadores', () => {
  beforeEach(() => {
    resetDedupeTelemetry();
    clearCrossTabDedupe();
  });

  describe('inferKeyKind / extractNamespace', () => {
    it('classifica chaves do projeto como idempotency', () => {
      expect(inferKeyKind('inbox:initial:5511@s.wa:100')).toBe('idempotency');
      expect(inferKeyKind('older:5511@s.wa:2026-04-01:100')).toBe('idempotency');
      expect(inferKeyKind('inbox:sidebar:7:200')).toBe('idempotency');
    });

    it('detecta hash hex de 32+ chars', () => {
      expect(inferKeyKind('a1b2c3d4e5f60718293a4b5c6d7e8f90:extra')).toBe('hash');
    });

    it('idempotency genérica para chaves namespaced desconhecidas', () => {
      expect(inferKeyKind('payments:checkout:42')).toBe('idempotency');
    });

    it('unknown para strings vazias ou sem estrutura', () => {
      expect(inferKeyKind('')).toBe('unknown');
      expect(inferKeyKind('plain')).toBe('unknown');
    });

    it('extractNamespace pega o prefixo antes de ":"', () => {
      expect(extractNamespace('inbox:initial:jid:100')).toBe('inbox');
      expect(extractNamespace('semNamespace')).toBe('semNamespace');
    });
  });

  describe('recordDedupeEvent — contadores', () => {
    it('contabiliza HIT por motivo e atualiza hitRate', () => {
      recordDedupeEvent({ key: 'inbox:initial:a:100', reason: 'memory_cache' });
      recordDedupeEvent({ key: 'inbox:initial:a:100', reason: 'persisted_cache' });
      recordDedupeEvent({ key: 'inbox:initial:a:100', reason: 'inflight_local' });

      const snap = getDedupeTelemetrySnapshot();
      expect(snap.total).toBe(3);
      expect(snap.hits).toBe(3);
      expect(snap.misses).toBe(0);
      expect(snap.hitRate).toBe(1);
      expect(snap.byReason.memory_cache).toBe(1);
      expect(snap.byReason.persisted_cache).toBe(1);
      expect(snap.byReason.inflight_local).toBe(1);
    });

    it('contabiliza MISS por motivo (lead vs fallback)', () => {
      recordDedupeEvent({ key: 'inbox:initial:b:100', reason: 'lock_acquired_lead', durationMs: 80 });
      recordDedupeEvent({ key: 'inbox:initial:b:100', reason: 'fallback_after_wait', durationMs: 5000 });

      const snap = getDedupeTelemetrySnapshot();
      expect(snap.misses).toBe(2);
      expect(snap.hits).toBe(0);
      expect(snap.hitRate).toBe(0);
      expect(snap.byReason.lock_acquired_lead).toBe(1);
      expect(snap.byReason.fallback_after_wait).toBe(1);
    });

    it('agrupa por keyKind (idempotency vs hash vs unknown)', () => {
      recordDedupeEvent({ key: 'inbox:initial:a:100', reason: 'memory_cache' });
      recordDedupeEvent({ key: 'a1b2c3d4e5f60718293a4b5c6d7e8f90:x', reason: 'memory_cache' });
      recordDedupeEvent({ key: 'plain', reason: 'lock_acquired_lead' });

      const snap = getDedupeTelemetrySnapshot();
      expect(snap.byKeyKind.idempotency).toBe(1);
      expect(snap.byKeyKind.hash).toBe(1);
      expect(snap.byKeyKind.unknown).toBe(1);
    });

    it('agrupa por namespace, separando hits e misses', () => {
      recordDedupeEvent({ key: 'inbox:initial:a:100', reason: 'memory_cache' });
      recordDedupeEvent({ key: 'inbox:poll:a:t', reason: 'lock_acquired_lead' });
      recordDedupeEvent({ key: 'older:a:t:100', reason: 'broadcast_wait' });

      const snap = getDedupeTelemetrySnapshot();
      expect(snap.byNamespace.inbox).toEqual({ hits: 1, misses: 1 });
      expect(snap.byNamespace.older).toEqual({ hits: 1, misses: 0 });
    });

    it('mantém os últimos N eventos em recentEvents', () => {
      for (let i = 0; i < 120; i++) {
        recordDedupeEvent({ key: `inbox:initial:k${i}:100`, reason: 'memory_cache' });
      }
      const snap = getDedupeTelemetrySnapshot();
      expect(snap.total).toBe(120);
      expect(snap.recentEvents.length).toBeLessThanOrEqual(100);
      // O último evento deve ser o k119
      expect(snap.recentEvents[snap.recentEvents.length - 1].key).toBe('inbox:initial:k119:100');
    });

    it('expõe snapshot em window.__dedupeTelemetry para DevTools', () => {
      recordDedupeEvent({ key: 'inbox:initial:a:100', reason: 'memory_cache' });
      const exposed = (window as unknown as { __dedupeTelemetry?: { total: number } })
        .__dedupeTelemetry;
      expect(exposed?.total).toBe(1);
    });
  });

  describe('integração com dedupedFetch', () => {
    it('1ª chamada: registra MISS lock_acquired_lead com duração', async () => {
      const fetcher = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 20));
        return 'v1';
      });
      await dedupedFetch('inbox:initial:int1:100', fetcher);
      const snap = getDedupeTelemetrySnapshot();
      expect(snap.misses).toBe(1);
      expect(snap.byReason.lock_acquired_lead).toBe(1);
      const evt = snap.recentEvents[0];
      expect(evt.outcome).toBe('miss');
      expect(evt.reason).toBe('lock_acquired_lead');
      expect(evt.keyKind).toBe('idempotency');
      expect(evt.namespace).toBe('inbox');
      expect(evt.durationMs).toBeGreaterThanOrEqual(15);
    });

    it('2ª chamada (mesma aba, dentro do TTL): registra HIT memory_cache', async () => {
      const fetcher = vi.fn(async () => 'v');
      await dedupedFetch('inbox:initial:int2:100', fetcher);
      await dedupedFetch('inbox:initial:int2:100', fetcher);
      await dedupedFetch('inbox:initial:int2:100', fetcher);

      expect(fetcher).toHaveBeenCalledTimes(1);
      const snap = getDedupeTelemetrySnapshot();
      expect(snap.byReason.lock_acquired_lead).toBe(1);
      expect(snap.byReason.memory_cache).toBe(2);
      expect(snap.hits).toBe(2);
      expect(snap.misses).toBe(1);
      expect(snap.hitRate).toBeCloseTo(2 / 3, 5);
    });

    it('chamadas concorrentes na mesma aba: 1 MISS + N-1 HIT inflight_local', async () => {
      const fetcher = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 30));
        return 'v';
      });
      await Promise.all([
        dedupedFetch('inbox:initial:int3:100', fetcher),
        dedupedFetch('inbox:initial:int3:100', fetcher),
        dedupedFetch('inbox:initial:int3:100', fetcher),
        dedupedFetch('inbox:initial:int3:100', fetcher),
      ]);
      const snap = getDedupeTelemetrySnapshot();
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(snap.byReason.lock_acquired_lead).toBe(1);
      expect(snap.byReason.inflight_local).toBe(3);
    });

    it('lock detido por outra aba + cache persistente: registra HIT persisted_cache', async () => {
      // Pré-popula cache persistente como se outra aba já tivesse rodado.
      localStorage.setItem(
        'ctd:result:inbox:initial:int4:100',
        JSON.stringify({ value: 'from-other-tab', expiresAt: Date.now() + 10_000 }),
      );
      const fetcher = vi.fn(async () => 'should-not-run');
      const r = await dedupedFetch('inbox:initial:int4:100', fetcher);
      expect(r).toBe('from-other-tab');
      expect(fetcher).not.toHaveBeenCalled();
      const snap = getDedupeTelemetrySnapshot();
      expect(snap.byReason.persisted_cache).toBe(1);
      expect(snap.hits).toBe(1);
    });

    it('erro no fetcher é registrado no evento com errorMessage', async () => {
      const fetcher = vi.fn(async () => {
        throw new Error('boom');
      });
      await expect(dedupedFetch('inbox:initial:int5:100', fetcher)).rejects.toThrow('boom');
      const snap = getDedupeTelemetrySnapshot();
      expect(snap.misses).toBe(1);
      const evt = snap.recentEvents[0];
      expect(evt.reason).toBe('lock_acquired_lead');
      expect(evt.errorMessage).toBe('boom');
    });
  });
});
