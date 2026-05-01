/**
 * useMessageStatus — precedência por timestamp quando AMBOS (bus e DB)
 * carregam errorCode/errorReason em estados terminais.
 *
 * Foco: timestamps próximos/ordenados (1ms, ms-precision, sub-segundo) e
 * a regra `bus.updatedAt >= dbTime` no `getMessageStatusDetail`.
 *
 * Diferente de `useMessageStatus.timeOrder.test.tsx`, que cobre desempate
 * de STATUS, este suite garante que os campos de erro também seguem o
 * mesmo vencedor — sem mistura entre fontes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const mockFrom = vi.fn();
const mockChannel = vi.fn().mockReturnValue({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
});
const mockRemoveChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    channel: (...args: unknown[]) => mockChannel(...args),
    removeChannel: (...args: unknown[]) => mockRemoveChannel(...args),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { useMessageStatus } from '@/features/inbox';
import { emitSendStatus, __resetSendStatusForTest } from '@/features/inbox';

function mockDbStatuses(rows: Array<Record<string, unknown>>) {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({ data: rows, error: null }),
        }),
      }),
    }),
  });
}

describe('useMessageStatus — precedência bus vs DB com erros em ambos', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
    vi.clearAllMocks();
    __resetSendStatusForTest?.();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetSendStatusForTest?.();
  });

  it('bus 1ms mais novo que DB → bus vence; errorCode/Reason do DB NÃO vazam', async () => {
    const dbTime = new Date('2024-06-01T12:00:00.000Z').toISOString();
    mockDbStatuses([
      {
        id: 'p1',
        status: 'failed',
        status_updated_at: dbTime,
        error_code: 'DB_ERR',
        error_reason: 'db reason',
      },
    ]);

    const { result } = renderHook(() => useMessageStatus('c-precedence'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Bus emitido +1ms depois do DB, com erros próprios diferentes
    act(() => {
      vi.setSystemTime(new Date('2024-06-01T12:00:00.001Z'));
      emitSendStatus('p1', {
        status: 'failed_auth',
        errorCode: 'BUS_AUTH',
        errorReason: 'bus reason',
      });
    });

    const detail = result.current.getMessageStatusDetail('p1');
    expect(detail?.status).toBe('failed_auth');
    // Bus venceu inteiramente: errorCode/Reason vêm do bus, sem fallback ao DB
    expect(detail?.errorCode).toBe('BUS_AUTH');
    expect(detail?.errorReason).toBe('bus reason');
  });

  it('DB 1ms mais novo que bus → DB vence; errorCode/Reason do bus NÃO vazam', async () => {
    // Bus em t0
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
    emitSendStatus('p2', {
      status: 'failed',
      errorCode: 'BUS_OLD',
      errorReason: 'bus old',
    });

    // DB com timestamp t0 + 1ms — ramo "DB vence"
    mockDbStatuses([
      {
        id: 'p2',
        status: 'failed_retries',
        status_updated_at: '2024-06-01T12:00:00.001Z',
        error_code: 'DB_NEW',
        error_reason: 'db new',
      },
    ]);

    const { result } = renderHook(() => useMessageStatus('c-precedence'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const detail = result.current.getMessageStatusDetail('p2');
    expect(detail?.status).toBe('failed_retries');
    expect(detail?.errorCode).toBe('DB_NEW');
    expect(detail?.errorReason).toBe('db new');
  });

  it('empate exato (bus.updatedAt === dbTime) → bus vence; errorCode/Reason do bus prevalecem', async () => {
    const sameIso = '2024-06-01T12:00:00.000Z';
    const sameTs = new Date(sameIso).getTime();

    mockDbStatuses([
      {
        id: 'p3',
        status: 'failed',
        status_updated_at: sameIso,
        error_code: 'DB_TIE',
        error_reason: 'db tie',
      },
    ]);

    const { result } = renderHook(() => useMessageStatus('c-precedence'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      vi.setSystemTime(sameTs);
      emitSendStatus('p3', {
        status: 'failed_auth',
        errorCode: 'BUS_TIE',
        errorReason: 'bus tie',
      });
    });

    const detail = result.current.getMessageStatusDetail('p3');
    // Regra `>=` favorece o bus em empate
    expect(detail?.status).toBe('failed_auth');
    expect(detail?.errorCode).toBe('BUS_TIE');
    expect(detail?.errorReason).toBe('bus tie');
  });

  it('bus vence mas SEM errorCode → faz fallback ao DB para errorCode/Reason', async () => {
    mockDbStatuses([
      {
        id: 'p4',
        status: 'failed',
        status_updated_at: '2024-06-01T12:00:00.000Z',
        error_code: 'DB_FALLBACK',
        error_reason: 'db fallback reason',
      },
    ]);

    const { result } = renderHook(() => useMessageStatus('c-precedence'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Bus mais novo, mas sem errorCode/errorReason
    act(() => {
      vi.setSystemTime(new Date('2024-06-01T12:00:00.500Z'));
      emitSendStatus('p4', { status: 'failed_retries' });
    });

    const detail = result.current.getMessageStatusDetail('p4');
    expect(detail?.status).toBe('failed_retries');
    // Bus venceu o status, mas como não trouxe erro, cai no DB
    expect(detail?.errorCode).toBe('DB_FALLBACK');
    expect(detail?.errorReason).toBe('db fallback reason');
  });

  it('sequência ordenada bus→DB→bus em janelas de poucos ms reflete sempre o último vencedor', async () => {
    // Estado inicial: DB em t = 0ms
    mockDbStatuses([
      {
        id: 'p5',
        status: 'failed',
        status_updated_at: '2024-06-01T12:00:00.000Z',
        error_code: 'DB_V1',
        error_reason: 'db v1',
      },
    ]);

    const { result } = renderHook(() => useMessageStatus('c-precedence'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Bus em t = +2ms (vence DB)
    act(() => {
      vi.setSystemTime(new Date('2024-06-01T12:00:00.002Z'));
      emitSendStatus('p5', {
        status: 'failed_auth',
        errorCode: 'BUS_V1',
        errorReason: 'bus v1',
      });
    });
    let detail = result.current.getMessageStatusDetail('p5');
    expect(detail?.status).toBe('failed_auth');
    expect(detail?.errorCode).toBe('BUS_V1');
    expect(detail?.errorReason).toBe('bus v1');

    // Novo bus em t = +5ms substitui o anterior (mesma fonte)
    act(() => {
      vi.setSystemTime(new Date('2024-06-01T12:00:00.005Z'));
      emitSendStatus('p5', {
        status: 'failed_retries',
        errorCode: 'BUS_V2',
        errorReason: 'bus v2',
      });
    });
    detail = result.current.getMessageStatusDetail('p5');
    expect(detail?.status).toBe('failed_retries');
    expect(detail?.errorCode).toBe('BUS_V2');
    expect(detail?.errorReason).toBe('bus v2');
  });

  it('DB com erro + bus terminal sem erro e MAIS ANTIGO → DB vence integralmente', async () => {
    // Bus emitido primeiro, sem erro
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));
    emitSendStatus('p6', { status: 'sent' });

    // DB chega com timestamp posterior + erro
    mockDbStatuses([
      {
        id: 'p6',
        status: 'failed',
        status_updated_at: '2024-06-01T12:00:00.250Z',
        error_code: 'DB_LATE',
        error_reason: 'late db error',
      },
    ]);

    const { result } = renderHook(() => useMessageStatus('c-precedence'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const detail = result.current.getMessageStatusDetail('p6');
    expect(detail?.status).toBe('failed');
    expect(detail?.errorCode).toBe('DB_LATE');
    expect(detail?.errorReason).toBe('late db error');
  });
});
