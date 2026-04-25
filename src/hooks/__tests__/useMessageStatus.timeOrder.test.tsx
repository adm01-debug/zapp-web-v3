/**
 * useMessageStatus — desempate temporal entre bus e DB.
 *
 * Garante que, quando ambos (bus e DB) carregam estados TERMINAIS para a
 * mesma mensagem, o mais recente vence (por updatedAt vs status_updated_at).
 * Usa fake timers para forçar a ordem de Date.now() chamado dentro do
 * sendStatusBus.emitSendStatus.
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

import { useMessageStatus } from '@/hooks/useMessageStatus';
import { emitSendStatus, __resetSendStatusForTest } from '@/hooks/realtime/sendStatusBus';

/** Helper: monta o mock do supabase.from('messages').select(...).eq.eq.not */
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

describe('useMessageStatus — desempate temporal bus vs DB (terminais)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
    vi.clearAllMocks();
    __resetSendStatusForTest?.();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetSendStatusForTest?.();
  });

  it('DB mais recente que bus → DB vence (status + errorCode/errorReason)', async () => {
    // Bus emitido em t0 = 10:00:00.000Z
    emitSendStatus('m1', { status: 'failed', errorCode: 'OLD_BUS', errorReason: 'old bus error' });

    // DB carregado com status_updated_at em t0 + 5s = 10:00:05.000Z
    mockDbStatuses([
      {
        id: 'm1',
        status: 'sent',
        status_updated_at: '2024-01-01T10:00:05.000Z',
        error_code: null,
        error_reason: null,
      },
    ]);

    const { result } = renderHook(() => useMessageStatus('c1'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const detail = result.current.getMessageStatusDetail('m1');
    expect(detail?.status).toBe('sent');
    // Como DB venceu e DB não tem erro, o errorCode/Reason do bus antigo NÃO deve vazar.
    expect(detail?.errorCode).toBeUndefined();
    expect(detail?.errorReason).toBeUndefined();
  });

  it('bus mais recente que DB → bus vence (status + errorCode/errorReason)', async () => {
    // DB com status_updated_at em 10:00:00.000Z
    mockDbStatuses([
      {
        id: 'm2',
        status: 'sent',
        status_updated_at: '2024-01-01T10:00:00.000Z',
        error_code: null,
        error_reason: null,
      },
    ]);

    const { result } = renderHook(() => useMessageStatus('c1'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Avança o relógio +10s e emite no bus (terminal mais novo)
    act(() => {
      vi.advanceTimersByTime(10_000);
      emitSendStatus('m2', {
        status: 'failed_auth',
        errorCode: 'AUTH_401',
        errorReason: 'token expired',
      });
    });

    const detail = result.current.getMessageStatusDetail('m2');
    expect(detail?.status).toBe('failed_auth');
    expect(detail?.errorCode).toBe('AUTH_401');
    expect(detail?.errorReason).toBe('token expired');
  });

  it('empate exato (busTime === dbTime) → bus vence pela regra >=', async () => {
    const sameTs = new Date('2024-01-01T10:00:00.000Z').getTime();
    vi.setSystemTime(sameTs);

    mockDbStatuses([
      {
        id: 'm3',
        status: 'sent',
        status_updated_at: '2024-01-01T10:00:00.000Z',
        error_code: null,
        error_reason: null,
      },
    ]);

    const { result } = renderHook(() => useMessageStatus('c1'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Emite no bus exatamente no mesmo instante do DB
    act(() => {
      vi.setSystemTime(sameTs);
      emitSendStatus('m3', { status: 'failed_retries', errorCode: 'EXHAUSTED', errorReason: 'max' });
    });

    const detail = result.current.getMessageStatusDetail('m3');
    // Regra: busTime >= dbTime → bus vence em empate
    expect(detail?.status).toBe('failed_retries');
    expect(detail?.errorCode).toBe('EXHAUSTED');
  });

  it('múltiplas mensagens: cada uma resolve seu desempate independentemente', async () => {
    // m4: bus antigo, DB novo  → DB vence
    // m5: DB antigo, bus novo  → bus vence
    emitSendStatus('m4', { status: 'failed', errorCode: 'OLD' });

    mockDbStatuses([
      {
        id: 'm4',
        status: 'sent',
        status_updated_at: '2024-01-01T10:00:30.000Z',
        error_code: null,
        error_reason: null,
      },
      {
        id: 'm5',
        status: 'sent',
        status_updated_at: '2024-01-01T10:00:00.000Z',
        error_code: null,
        error_reason: null,
      },
    ]);

    const { result } = renderHook(() => useMessageStatus('c1'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Avança e emite bus mais novo só para m5
    act(() => {
      vi.advanceTimersByTime(60_000);
      emitSendStatus('m5', { status: 'failed', errorCode: 'NEW_BUS', errorReason: 'recent fail' });
    });

    const m4 = result.current.getMessageStatusDetail('m4');
    const m5 = result.current.getMessageStatusDetail('m5');

    expect(m4?.status).toBe('sent');
    expect(m4?.errorCode).toBeUndefined();

    expect(m5?.status).toBe('failed');
    expect(m5?.errorCode).toBe('NEW_BUS');
    expect(m5?.errorReason).toBe('recent fail');
  });

  it('terminal no DB + transient no bus (sending) → bus sempre vence (regra TRANSIENT), independente do tempo', async () => {
    // DB com terminal recentíssimo (futuro)
    mockDbStatuses([
      {
        id: 'm6',
        status: 'failed',
        status_updated_at: '2099-01-01T00:00:00.000Z',
        error_code: 'DB_FAIL',
        error_reason: 'db fail',
      },
    ]);

    const { result } = renderHook(() => useMessageStatus('c1'));

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Bus com transient antigo
    act(() => {
      vi.setSystemTime(new Date('2024-01-01T10:00:00.000Z'));
      emitSendStatus('m6', { status: 'sending' });
    });

    const detail = result.current.getMessageStatusDetail('m6');
    // TRANSIENT do bus sobrepõe terminal do DB mesmo sendo cronologicamente anterior.
    expect(detail?.status).toBe('sending');
  });
});
