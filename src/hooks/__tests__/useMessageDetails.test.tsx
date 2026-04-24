import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const timedRpcMock = vi.fn();
vi.mock('@/lib/instrumentedExternal', () => ({
  timedRpc: (...args: unknown[]) => timedRpcMock(...args),
}));

import { useMessageDetails } from '../useMessageDetails';

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

function makeFullMessage(id: string) {
  return {
    id, message_id: id, remote_jid: 'x@s.whatsapp.net', from_me: false,
    message_type: 'text', content: 'hi', created_at: '2026-04-23T10:00:00Z',
    direction: 'inbound', status: 'read', sent_by_bot: false, instance_name: 'wpp2',
    payload: { foo: 'bar' }, raw_data: { event: 'messages.upsert' },
  };
}

describe('useMessageDetails', () => {
  beforeEach(() => {
    timedRpcMock.mockReset();
  });

  it('does not fetch when messageId is null', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useMessageDetails(null), { wrapper: wrapper(client) });
    await new Promise((r) => setTimeout(r, 10));
    expect(timedRpcMock).not.toHaveBeenCalled();
    expect(result.current.data).toBeUndefined();
  });

  it('does not fetch when enabled=false', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderHook(() => useMessageDetails('abc', { enabled: false }), { wrapper: wrapper(client) });
    await new Promise((r) => setTimeout(r, 10));
    expect(timedRpcMock).not.toHaveBeenCalled();
  });

  it('calls rpc_get_message_details with correct param and returns data', async () => {
    timedRpcMock.mockResolvedValueOnce({ data: makeFullMessage('m1'), error: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useMessageDetails('m1'), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(timedRpcMock).toHaveBeenCalledWith('rpc_get_message_details', { p_message_id: 'm1' });
    expect(result.current.data?.id).toBe('m1');
  });

  it('caches by messageId — second hook with same id reuses query', async () => {
    timedRpcMock.mockResolvedValueOnce({ data: makeFullMessage('m1'), error: null });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 60_000 } } });
    const { result: r1 } = renderHook(() => useMessageDetails('m1'), { wrapper: wrapper(client) });
    await waitFor(() => expect(r1.current.isLoading).toBe(false));
    const { result: r2 } = renderHook(() => useMessageDetails('m1'), { wrapper: wrapper(client) });
    await waitFor(() => expect(r2.current.data?.id).toBe('m1'));
    expect(timedRpcMock).toHaveBeenCalledTimes(1);
  });

  it('propagates error', async () => {
    timedRpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useMessageDetails('m1'), { wrapper: wrapper(client) });
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.error?.message).toBe('boom');
  });
});
