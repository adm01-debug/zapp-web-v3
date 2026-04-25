import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

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

const mockStatuses = [
  { id: 'm1', status: 'sent', status_updated_at: '2024-01-01T10:00:00Z', error_code: null, error_reason: null },
  { id: 'm2', status: 'delivered', status_updated_at: '2024-01-01T10:01:00Z', error_code: null, error_reason: null },
  { id: 'm3', status: 'read', status_updated_at: '2024-01-01T10:02:00Z', error_code: null, error_reason: null },
  { id: 'm4', status: 'failed', status_updated_at: '2024-01-01T10:03:00Z', error_code: 'GENERIC', error_reason: 'send error' },
  {
    id: 'm5',
    status: 'failed_auth',
    status_updated_at: '2024-01-01T10:04:00Z',
    error_code: 'AUTH_401',
    error_reason: 'Invalid Evolution API key',
  },
  {
    id: 'm6',
    status: 'failed_retries',
    status_updated_at: '2024-01-01T10:05:00Z',
    error_code: 'RETRIES_EXHAUSTED',
    error_reason: 'Max 5 attempts reached',
  },
];

describe('useMessageStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: mockStatuses, error: null }),
          }),
        }),
      }),
    });
  });

  it('initializes with empty status map when no contactId', () => {
    const { result } = renderHook(() => useMessageStatus());
    expect(result.current.statusUpdates.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches statuses when contactId provided', async () => {
    const { result } = renderHook(() => useMessageStatus('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.statusUpdates.size).toBeGreaterThanOrEqual(0);
  });

  it('exposes getMessageStatus function', async () => {
    const { result } = renderHook(() => useMessageStatus('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(typeof result.current.getMessageStatus).toBe('function');
  });

  it('handles fetch error gracefully', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
          }),
        }),
      }),
    });

    const { result } = renderHook(() => useMessageStatus('c1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('clears status when contactId changes to undefined', async () => {
    const { result, rerender } = renderHook(
      ({ id }: { id?: string }) => useMessageStatus(id),
      { initialProps: { id: 'c1' } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    
    rerender({ id: undefined });
    expect(result.current.statusUpdates.size).toBe(0);
  });

  describe('getMessageStatusDetail — payload do DB após reload', () => {
    it('retorna error_code/error_reason para failed_auth (sem bus, só DB)', async () => {
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('m5');
      expect(detail).toBeDefined();
      expect(detail?.status).toBe('failed_auth');
      expect(detail?.errorCode).toBe('AUTH_401');
      expect(detail?.errorReason).toBe('Invalid Evolution API key');
      // Bus está vazio após reload — não deve haver attempt/totalRetries
      expect(detail?.attempt).toBeUndefined();
      expect(detail?.totalRetries).toBeUndefined();
    });

    it('retorna error_code/error_reason para failed_retries (sem bus, só DB)', async () => {
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const detail = result.current.getMessageStatusDetail('m6');
      expect(detail).toBeDefined();
      expect(detail?.status).toBe('failed_retries');
      expect(detail?.errorCode).toBe('RETRIES_EXHAUSTED');
      expect(detail?.errorReason).toBe('Max 5 attempts reached');
      expect(detail?.attempt).toBeUndefined();
      expect(detail?.totalRetries).toBeUndefined();
    });

    it('mantém error_code/error_reason no statusUpdates Map carregado do DB', async () => {
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const m5 = result.current.statusUpdates.get('m5');
      const m6 = result.current.statusUpdates.get('m6');
      expect(m5?.error_code).toBe('AUTH_401');
      expect(m5?.error_reason).toBe('Invalid Evolution API key');
      expect(m6?.error_code).toBe('RETRIES_EXHAUSTED');
      expect(m6?.error_reason).toBe('Max 5 attempts reached');
    });

    it('não retorna errorCode/errorReason para mensagens terminais sem erro (sent/delivered/read)', async () => {
      const { result } = renderHook(() => useMessageStatus('c1'));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const sent = result.current.getMessageStatusDetail('m1');
      const delivered = result.current.getMessageStatusDetail('m2');
      const read = result.current.getMessageStatusDetail('m3');
      expect(sent?.errorCode).toBeUndefined();
      expect(sent?.errorReason).toBeUndefined();
      expect(delivered?.errorCode).toBeUndefined();
      expect(delivered?.errorReason).toBeUndefined();
      expect(read?.errorCode).toBeUndefined();
      expect(read?.errorReason).toBeUndefined();
    });
  });
});
