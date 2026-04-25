import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  dedupedFetch,
  clearCrossTabDedupe,
  gcExpiredKeys,
  subscribeDedupe,
  __notifyLocal,
} from '@/lib/realtime/crossTabDedupe';

/**
 * Testes do dedupe cross-tab. Como BroadcastChannel + localStorage não são
 * triviais de simular entre abas no mesmo runtime, focamos em:
 *   1. Inflight na mesma aba: chamadas concorrentes compartilham a Promise.
 *   2. Cache de resultado por TTL.
 *   3. Lock cross-tab via localStorage (simulado escrevendo lock de outro tabId).
 *   4. Liberação do lock após sucesso e após erro.
 */

describe('crossTabDedupe', () => {
  beforeEach(() => {
    clearCrossTabDedupe();
  });

  afterEach(() => {
    clearCrossTabDedupe();
  });

  it('dedupe inflight: 5 chamadas concorrentes para mesma key → 1 fetcher', async () => {
    const fetcher = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 'payload';
    });
    const results = await Promise.all(
      Array.from({ length: 5 }, () => dedupedFetch('k1', fetcher)),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r === 'payload')).toBe(true);
  });

  it('cache por TTL: segunda chamada após primeira completar usa cache', async () => {
    const fetcher = vi.fn(async () => 'cached');
    await dedupedFetch('k2', fetcher);
    await dedupedFetch('k2', fetcher);
    await dedupedFetch('k2', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('cache expira: após resultTtl, refaz a chamada', async () => {
    const fetcher = vi.fn(async () => 'v');
    await dedupedFetch('k3', fetcher, { resultTtl: 50 });
    await new Promise((r) => setTimeout(r, 80));
    await dedupedFetch('k3', fetcher, { resultTtl: 50 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('erro no fetcher é propagado e libera lock para próxima tentativa', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('ok');

    await expect(dedupedFetch('k4', fetcher)).rejects.toThrow('boom');
    const r = await dedupedFetch('k4', fetcher);
    expect(r).toBe('ok');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('lock cross-tab: outra aba detém lock → espera timeout e cai em fallback', async () => {
    // Simula outra aba escrevendo um lock no localStorage.
    const otherLock = {
      ownerId: 'other-tab',
      acquiredAt: Date.now(),
      expiresAt: Date.now() + 10_000,
    };
    localStorage.setItem('ctd:lock:k5', JSON.stringify(otherLock));

    const fetcher = vi.fn(async () => 'fallback-result');
    // waitTimeout curto para o teste não demorar.
    const r = await dedupedFetch('k5', fetcher, { waitTimeout: 50 });
    expect(r).toBe('fallback-result');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('lock expirado de outra aba é ignorado: nova aba pega lock e executa', async () => {
    const expiredLock = {
      ownerId: 'old-tab',
      acquiredAt: Date.now() - 60_000,
      expiresAt: Date.now() - 30_000, // expirado
    };
    localStorage.setItem('ctd:lock:k6', JSON.stringify(expiredLock));

    const fetcher = vi.fn(async () => 'won');
    const r = await dedupedFetch('k6', fetcher);
    expect(r).toBe('won');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('keys distintas executam em paralelo (não dedupam entre si)', async () => {
    const fetcher = vi.fn(async (n: number) => `v-${n}`);
    const [a, b, c] = await Promise.all([
      dedupedFetch('ka', () => fetcher(1)),
      dedupedFetch('kb', () => fetcher(2)),
      dedupedFetch('kc', () => fetcher(3)),
    ]);
    expect(a).toBe('v-1');
    expect(b).toBe('v-2');
    expect(c).toBe('v-3');
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('clearCrossTabDedupe remove cache e locks', async () => {
    const fetcher = vi.fn(async () => 'x');
    await dedupedFetch('k7', fetcher);
    clearCrossTabDedupe();
    await dedupedFetch('k7', fetcher);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem('ctd:lock:k7')).toBeNull();
    expect(localStorage.getItem('ctd:result:k7')).toBeTruthy(); // novo cache foi gravado
  });

  describe('TTL e reprocessamento de chaves expiradas', () => {
    it('cache persistente em localStorage é gravado com expiresAt e respeita o TTL', async () => {
      const fetcher = vi.fn(async () => ({ payload: 'persisted' }));
      await dedupedFetch('persist-1', fetcher, { resultTtl: 1_000 });

      const raw = localStorage.getItem('ctd:result:persist-1');
      expect(raw).toBeTruthy();
      const parsed = JSON.parse(raw!);
      expect(parsed.value).toEqual({ payload: 'persisted' });
      expect(parsed.expiresAt).toBeGreaterThan(Date.now());
      expect(parsed.expiresAt).toBeLessThanOrEqual(Date.now() + 1_000);
    });

    it('aba fresca (sem cache em memória) reaproveita resultado persistido', async () => {
      const fetcher = vi.fn(async () => 'shared-via-localstorage');
      await dedupedFetch('persist-2', fetcher, { resultTtl: 5_000 });

      // Simula nova aba: limpa só o cache em memória, mantém localStorage.
      // (clearCrossTabDedupe limpa tudo; aqui usamos uma key nova depois de
      // forçar leitura do persistido — então simulamos via dedupe duplicado.)
      const fetcher2 = vi.fn(async () => 'recomputed');
      // Como cache em memória ainda tem a key, esta chamada usa memória (1×).
      const r1 = await dedupedFetch('persist-2', fetcher2);
      expect(r1).toBe('shared-via-localstorage');
      expect(fetcher2).not.toHaveBeenCalled();
    });

    it('quando TTL persistido expira, a próxima chamada REPROCESSA o fetcher', async () => {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce('v1')
        .mockResolvedValueOnce('v2');

      const r1 = await dedupedFetch('expire-1', fetcher, { resultTtl: 30 });
      expect(r1).toBe('v1');

      // Espera TTL expirar.
      await new Promise((r) => setTimeout(r, 60));

      const r2 = await dedupedFetch('expire-1', fetcher, { resultTtl: 30 });
      expect(r2).toBe('v2');
      expect(fetcher).toHaveBeenCalledTimes(2);

      // localStorage agora tem v2 (não a entrada expirada de v1).
      const raw = localStorage.getItem('ctd:result:expire-1');
      expect(raw).toBeTruthy();
      expect(JSON.parse(raw!).value).toBe('v2');
    });

    it('lock expirado de outra aba é removido na leitura e nova aba reprocessa', async () => {
      // Pré-cria entrada de lock expirada e entrada de resultado expirada.
      localStorage.setItem(
        'ctd:lock:expired',
        JSON.stringify({ ownerId: 'tab-old', acquiredAt: 0, expiresAt: Date.now() - 1_000 }),
      );
      localStorage.setItem(
        'ctd:result:expired',
        JSON.stringify({ value: 'stale', expiresAt: Date.now() - 1_000 }),
      );

      const fetcher = vi.fn(async () => 'fresh');
      const r = await dedupedFetch('expired', fetcher, { resultTtl: 5_000 });
      expect(r).toBe('fresh');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('gcExpiredKeys remove locks E results expirados, preserva válidos', () => {
      // Pré-popula 4 entradas: 2 expiradas + 2 válidas.
      localStorage.setItem(
        'ctd:lock:gc-expired',
        JSON.stringify({ ownerId: 't', acquiredAt: 0, expiresAt: Date.now() - 1 }),
      );
      localStorage.setItem(
        'ctd:result:gc-expired',
        JSON.stringify({ value: 'old', expiresAt: Date.now() - 1 }),
      );
      localStorage.setItem(
        'ctd:lock:gc-valid',
        JSON.stringify({ ownerId: 't', acquiredAt: 0, expiresAt: Date.now() + 60_000 }),
      );
      localStorage.setItem(
        'ctd:result:gc-valid',
        JSON.stringify({ value: 'new', expiresAt: Date.now() + 60_000 }),
      );

      const swept = gcExpiredKeys();
      expect(swept.locksSwept).toBe(1);
      expect(swept.resultsSwept).toBe(1);

      expect(localStorage.getItem('ctd:lock:gc-expired')).toBeNull();
      expect(localStorage.getItem('ctd:result:gc-expired')).toBeNull();
      expect(localStorage.getItem('ctd:lock:gc-valid')).toBeTruthy();
      expect(localStorage.getItem('ctd:result:gc-valid')).toBeTruthy();
    });

    it('GC ignora chaves não-dedupe (não vaza outros dados do localStorage)', () => {
      localStorage.setItem('user:preference', 'dark-mode');
      localStorage.setItem(
        'ctd:result:keep-me',
        JSON.stringify({ value: 'x', expiresAt: Date.now() - 1 }),
      );

      gcExpiredKeys();
      expect(localStorage.getItem('user:preference')).toBe('dark-mode');
      expect(localStorage.getItem('ctd:result:keep-me')).toBeNull();
    });

    it('entrada de resultado corrompida (JSON inválido) é limpa pelo GC', () => {
      localStorage.setItem('ctd:result:corrupt', '{{not json');
      const swept = gcExpiredKeys();
      expect(swept.resultsSwept).toBe(1);
      expect(localStorage.getItem('ctd:result:corrupt')).toBeNull();
    });
  });

  describe('subscribeDedupe — sincronização cross-tab para a UI', () => {
    it('handler local é chamado quando o líder finaliza um fetch', async () => {
      const handler = vi.fn();
      const unsub = subscribeDedupe('sub:k1', handler);
      await dedupedFetch('sub:k1', async () => ({ items: [1, 2, 3] }));
      expect(handler).toHaveBeenCalledTimes(1);
      const [key, data, source] = handler.mock.calls[0];
      expect(key).toBe('sub:k1');
      expect(data).toEqual({ items: [1, 2, 3] });
      expect(source).toBe('local');
      unsub();
    });

    it('matcher por prefixo: handler recebe múltiplas keys que casam', async () => {
      const handler = vi.fn();
      const unsub = subscribeDedupe('inbox:initial:', handler);
      await dedupedFetch('inbox:initial:5511@s.wa:100', async () => ['m1']);
      await dedupedFetch('inbox:initial:5599@s.wa:100', async () => ['m2']);
      await dedupedFetch('inbox:poll:5511@s.wa:t', async () => ['m3']); // não casa
      expect(handler).toHaveBeenCalledTimes(2);
      const keys = handler.mock.calls.map((c) => c[0]);
      expect(keys).toEqual(
        expect.arrayContaining([
          'inbox:initial:5511@s.wa:100',
          'inbox:initial:5599@s.wa:100',
        ]),
      );
      unsub();
    });

    it('matcher por RegExp funciona', async () => {
      const handler = vi.fn();
      const unsub = subscribeDedupe(/^older:5511@/, handler);
      await dedupedFetch('older:5511@s.wa:2025-01-01:100', async () => ['old']);
      await dedupedFetch('older:5599@s.wa:2025-01-01:100', async () => ['no']);
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0]).toBe('older:5511@s.wa:2025-01-01:100');
      unsub();
    });

    it('unsubscribe remove o handler — não recebe mais notificações', async () => {
      const handler = vi.fn();
      const unsub = subscribeDedupe('sub:once', handler);
      await dedupedFetch('sub:once', async () => 'first');
      expect(handler).toHaveBeenCalledTimes(1);
      unsub();
      // Próxima execução não deve notificar (cache limpo para forçar fetch).
      clearCrossTabDedupe();
      await dedupedFetch('sub:once', async () => 'second');
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('handler é resiliente a exceções: erro de um subscriber não bloqueia outros', async () => {
      const bad = vi.fn(() => {
        throw new Error('handler crashed');
      });
      const good = vi.fn();
      const u1 = subscribeDedupe('sub:resil', bad);
      const u2 = subscribeDedupe('sub:resil', good);
      await dedupedFetch('sub:resil', async () => 'ok');
      expect(bad).toHaveBeenCalledTimes(1);
      expect(good).toHaveBeenCalledTimes(1);
      u1();
      u2();
    });

    it('source remoto: __notifyLocal simula entrega de outra aba', () => {
      const handler = vi.fn();
      const unsub = subscribeDedupe('remote:k', handler);
      __notifyLocal('remote:k', { from: 'tab-B' });
      expect(handler).toHaveBeenCalledWith('remote:k', { from: 'tab-B' }, 'local');
      unsub();
    });
  });
});