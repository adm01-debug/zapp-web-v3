/**
 * Garante que o "toast de alerta" (insert em warroom_alerts, que é o gatilho
 * do toast em useWarRoomAlerts) só dispara UMA vez por (instância × janela
 * de horas) e reseta apenas ao mudar a janela.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const insertMock = vi.fn().mockResolvedValue({ error: null });
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (_table: string) => ({ insert: insertMock }),
  },
}));

vi.mock('@/hooks/useUserRole', () => ({
  // Hook reads `isDev`; we keep `isAdmin` too for any other callsite that
  // still expects the legacy field.
  useUserRole: () => ({ isAdmin: true, isDev: true, loading: false }),
}));

const proxyMock = vi.fn();
vi.mock('@/lib/externalProxy', () => ({
  queryExternalProxy: (...args: unknown[]) => proxyMock(...args),
}));

import {
  useIdempotencyMissAlerts,
  __test__,
} from '../useIdempotencyMissAlerts';

const { ALERT_DEDUPE_STORAGE_KEY, ONE_HOUR_MS, buildPersistKey } = __test__;

function makeMissRows(instance: string, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `m-${instance}-${i}`,
    action: 'idempotency_miss',
    metadata: { instance_name: instance },
    created_at: new Date().toISOString(),
  }));
}

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('useIdempotencyMissAlerts — toast dedupe by (instance × hour window)', () => {
  beforeEach(() => {
    // Apenas Date é mockado — setTimeout/queueMicrotask continuam reais para waitFor funcionar.
    vi.useFakeTimers({ toFake: ['Date'] });
    window.localStorage.clear();
    insertMock.mockClear();
    proxyMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispara o alerta exatamente uma vez para a mesma instância na mesma janela, mesmo após re-renders', async () => {
    vi.setSystemTime(new Date('2026-04-25T10:15:00Z'));
    proxyMock.mockResolvedValue({ data: makeMissRows('wpp2', 80) });

    const { result, rerender } = renderHook(
      () => useIdempotencyMissAlerts({ threshold: 50 }),
      { wrapper: wrapper() }
    );

    await waitFor(() => expect(result.current.counts.length).toBeGreaterThan(0));
    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));

    // Re-render simulando novo poll na MESMA janela: não deve disparar de novo.
    rerender();
    rerender();
    await new Promise((r) => setTimeout(r, 0));
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it('persiste o dedupe no localStorage com chave (instância × hour-bucket)', async () => {
    const now = new Date('2026-04-25T10:15:00Z');
    vi.setSystemTime(now);
    proxyMock.mockResolvedValue({ data: makeMissRows('wpp2', 80) });

    renderHook(() => useIdempotencyMissAlerts({ threshold: 50 }), { wrapper: wrapper() });
    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));

    const raw = window.localStorage.getItem(ALERT_DEDUPE_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw ?? '{}') as Record<string, unknown>;
    const expectedKey = buildPersistKey('wpp2', now.getTime());
    expect(parsed[expectedKey]).toBeTypeOf('number');
  });

  it('não re-dispara após "refresh da página" enquanto a janela ainda for a mesma', async () => {
    const now = new Date('2026-04-25T10:15:00Z').getTime();
    vi.setSystemTime(now);
    // Simula o estado pós-refresh: localStorage já contém a entrada da janela atual.
    window.localStorage.setItem(
      ALERT_DEDUPE_STORAGE_KEY,
      JSON.stringify({ [buildPersistKey('wpp2', now)]: now - 5 * 60_000 })
    );
    proxyMock.mockResolvedValue({ data: makeMissRows('wpp2', 80) });

    renderHook(() => useIdempotencyMissAlerts({ threshold: 50 }), { wrapper: wrapper() });
    // Esperar o ciclo do effect
    await new Promise((r) => setTimeout(r, 50));
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('reseta e dispara novamente quando a janela de horas muda', async () => {
    const t0 = new Date('2026-04-25T10:15:00Z').getTime();
    const t1 = t0 + ONE_HOUR_MS + 60_000; // janela seguinte

    // Pré-popula localStorage com a entrada da janela ANTIGA (simulando alerta já disparado).
    window.localStorage.setItem(
      ALERT_DEDUPE_STORAGE_KEY,
      JSON.stringify({ [buildPersistKey('wpp2', t0)]: t0 }),
    );

    // Avança o relógio para a próxima janela.
    vi.setSystemTime(t1);
    proxyMock.mockResolvedValue({ data: makeMissRows('wpp2', 80) });

    renderHook(() => useIdempotencyMissAlerts({ threshold: 50 }), { wrapper: wrapper() });

    // O insert DEVE acontecer porque o hour-bucket é diferente.
    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));

    // E a chave gravada deve ser a do novo bucket, não a antiga.
    const expectedNewKey = buildPersistKey('wpp2', t1);
    const expectedOldKey = buildPersistKey('wpp2', t0);
    expect(expectedNewKey).not.toBe(expectedOldKey);
    expect(insertMock.mock.calls[0][0].source).toBe(expectedNewKey);
  });

  it('dispara um alerta independente por instância dentro da mesma janela', async () => {
    vi.setSystemTime(new Date('2026-04-25T10:15:00Z'));
    proxyMock.mockResolvedValue({
      data: [...makeMissRows('wpp2', 60), ...makeMissRows('wpp3', 60)],
    });

    renderHook(() => useIdempotencyMissAlerts({ threshold: 50 }), { wrapper: wrapper() });

    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(2));
    const sources = insertMock.mock.calls.map((c) => c[0].source);
    expect(sources.some((s) => s.includes('wpp2'))).toBe(true);
    expect(sources.some((s) => s.includes('wpp3'))).toBe(true);
  });
});
