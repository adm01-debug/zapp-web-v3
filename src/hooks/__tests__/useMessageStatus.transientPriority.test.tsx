/**
 * useMessageStatus — prioridade de transitórios do bus (sending/retrying)
 * sobre o DB enquanto ativos, e transição correta quando "expiram"
 * (clearSendStatus ou emissão de status terminal).
 *
 * Cobertura:
 *   1. bus=sending vence DB=sent (transient overrides terminal mais novo).
 *   2. bus=retrying vence DB=failed_retries (transient overrides terminal mais novo).
 *   3. retrying expõe attempt/totalRetries via getMessageStatusDetail.
 *   4. clearSendStatus → DB volta a ser fonte de verdade.
 *   5. Transição transient → terminal (emit terminal sobrescreve transient).
 *   6. Transient mais antigo que DB ainda vence (regra TRANSIENT ignora tempo).
 *   7. Quando expira para terminal mais novo, errorCode/Reason do bus
 *      têm precedência; quando expira para DB, errorCode/Reason do DB.
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
import {
  emitSendStatus,
  clearSendStatus,
  __resetSendStatusForTest,
} from '@/hooks/realtime/sendStatusBus';

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

describe('useMessageStatus — transitórios do bus vencem DB e expiram corretamente', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
    vi.clearAllMocks();
    __resetSendStatusForTest?.();
  });

  afterEach(() => {
    vi.useRealTimers();
    __resetSendStatusForTest?.();
  });

  it('bus=sending sobrescreve DB=sent enquanto ativo', async () => {
    mockDbStatuses([
      { id: 'm1', status: 'sent', status_updated_at: '2024-01-01T10:00:05.000Z' },
    ]);
    const { result } = renderHook(() => useMessageStatus('c1'));
    await waitFor(() => expect(result.current.statusUpdates.get('m1')).toBeDefined());

    // Bus emite sending DEPOIS de o DB ter sido carregado, mas com timestamp ANTERIOR.
    vi.setSystemTime(new Date('2024-01-01T10:00:00Z'));
    act(() => {
      emitSendStatus('m1', { status: 'sending' });
    });

    await waitFor(() => {
      expect(result.current.getMessageStatus('m1')).toBe('sending');
    });
    expect(result.current.getMessageStatusDetail('m1')?.status).toBe('sending');
  });

  it('bus=retrying sobrescreve DB=failed_retries e expõe attempt/totalRetries', async () => {
    mockDbStatuses([
      {
        id: 'm2',
        status: 'failed_retries',
        status_updated_at: '2024-01-01T10:00:10.000Z',
        error_code: 'OLD_FAIL',
        error_reason: 'old',
      },
    ]);
    const { result } = renderHook(() => useMessageStatus('c1'));
    await waitFor(() => expect(result.current.statusUpdates.get('m2')).toBeDefined());

    act(() => {
      emitSendStatus('m2', { status: 'retrying', attempt: 2, totalRetries: 3 });
    });

    await waitFor(() => {
      expect(result.current.getMessageStatus('m2')).toBe('retrying');
    });
    const detail = result.current.getMessageStatusDetail('m2');
    expect(detail?.status).toBe('retrying');
    expect(detail?.attempt).toBe(2);
    expect(detail?.totalRetries).toBe(3);
  });

  it('clearSendStatus expira o transient → DB volta a ser fonte de verdade', async () => {
    mockDbStatuses([
      {
        id: 'm3',
        status: 'sent',
        status_updated_at: '2024-01-01T10:00:05.000Z',
        error_code: null,
        error_reason: null,
      },
    ]);
    const { result } = renderHook(() => useMessageStatus('c1'));
    await waitFor(() => expect(result.current.statusUpdates.get('m3')).toBeDefined());

    act(() => emitSendStatus('m3', { status: 'sending' }));
    await waitFor(() => expect(result.current.getMessageStatus('m3')).toBe('sending'));

    // "Expira" o transient
    act(() => clearSendStatus('m3'));

    await waitFor(() => expect(result.current.getMessageStatus('m3')).toBe('sent'));
    const detail = result.current.getMessageStatusDetail('m3');
    expect(detail?.status).toBe('sent');
    expect(detail?.attempt).toBeUndefined();
    expect(detail?.totalRetries).toBeUndefined();
  });

  it('transição transient → terminal: emit terminal substitui retrying', async () => {
    mockDbStatuses([
      {
        id: 'm4',
        status: 'sending',
        status_updated_at: '2024-01-01T10:00:00.000Z',
      },
    ]);
    const { result } = renderHook(() => useMessageStatus('c1'));
    await waitFor(() => expect(result.current.statusUpdates.get('m4')).toBeDefined());

    act(() => emitSendStatus('m4', { status: 'retrying', attempt: 1, totalRetries: 3 }));
    await waitFor(() => expect(result.current.getMessageStatus('m4')).toBe('retrying'));

    // Transição: tentativa final falhou
    vi.setSystemTime(new Date('2024-01-01T10:00:30.000Z'));
    act(() =>
      emitSendStatus('m4', {
        status: 'failed_retries',
        errorCode: 'RETRIES_EXHAUSTED',
        errorReason: '3/3 falhou',
      }),
    );

    await waitFor(() => expect(result.current.getMessageStatus('m4')).toBe('failed_retries'));
    const detail = result.current.getMessageStatusDetail('m4');
    expect(detail?.status).toBe('failed_retries');
    expect(detail?.errorCode).toBe('RETRIES_EXHAUSTED');
    expect(detail?.errorReason).toBe('3/3 falhou');
  });

  it('transient antigo no bus ainda vence DB terminal mais novo (regra TRANSIENT ignora tempo)', async () => {
    // Bus emitido em t0 = 10:00:00
    act(() => emitSendStatus('m5', { status: 'sending' }));

    // DB carregado com status terminal MUITO mais novo (t0 + 60s)
    mockDbStatuses([
      { id: 'm5', status: 'delivered', status_updated_at: '2024-01-01T10:01:00.000Z' },
    ]);
    const { result } = renderHook(() => useMessageStatus('c1'));
    await waitFor(() => expect(result.current.statusUpdates.get('m5')).toBeDefined());

    // Mesmo o DB sendo terminal e mais recente, o transient vence enquanto ativo.
    expect(result.current.getMessageStatus('m5')).toBe('sending');
  });

  it('após clear, errorCode/Reason vêm do DB (transient não polui terminal)', async () => {
    mockDbStatuses([
      {
        id: 'm6',
        status: 'failed_auth',
        status_updated_at: '2024-01-01T10:00:05.000Z',
        error_code: 'AUTH_401',
        error_reason: 'Invalid key',
      },
    ]);
    const { result } = renderHook(() => useMessageStatus('c1'));
    await waitFor(() => expect(result.current.statusUpdates.get('m6')).toBeDefined());

    act(() => emitSendStatus('m6', { status: 'retrying', attempt: 1, totalRetries: 3 }));
    await waitFor(() => expect(result.current.getMessageStatus('m6')).toBe('retrying'));

    act(() => clearSendStatus('m6'));

    await waitFor(() => expect(result.current.getMessageStatus('m6')).toBe('failed_auth'));
    const detail = result.current.getMessageStatusDetail('m6');
    expect(detail?.errorCode).toBe('AUTH_401');
    expect(detail?.errorReason).toBe('Invalid key');
    expect(detail?.attempt).toBeUndefined();
  });
});
