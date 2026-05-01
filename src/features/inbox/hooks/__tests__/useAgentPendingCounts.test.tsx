// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));

import { useAgentPendingCounts } from '@/features/useAgentPendingCounts';

function wrapper({ children }: any) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function makeChain(rows: any[]) {
  // mirrors the chain: .select().in().eq().not().limit()
  const limit = vi.fn().mockResolvedValue({ data: rows, error: null });
  const not = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ not });
  const inFn = vi.fn().mockReturnValue({ eq });
  const select = vi.fn().mockReturnValue({ in: inFn });
  return { select };
}

beforeEach(() => mockFrom.mockReset());

describe('useAgentPendingCounts', () => {
  it('counts pending and failed grouped by agent_id', async () => {
    mockFrom.mockReturnValue(
      makeChain([
        { agent_id: 'a1', status: 'pending', sender: 'me' },
        { agent_id: 'a1', status: 'failed', sender: 'me' },
        { agent_id: 'a2', status: 'pending', sender: 'me' },
      ]),
    );
    const { result } = renderHook(() => useAgentPendingCounts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.counts).toEqual({ a1: 2, a2: 1 });
  });

  it('returns empty record when no pendentes', async () => {
    mockFrom.mockReturnValue(makeChain([]));
    const { result } = renderHook(() => useAgentPendingCounts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.counts).toEqual({});
  });

  it('skips rows with null agent_id (defensive)', async () => {
    mockFrom.mockReturnValue(
      makeChain([
        { agent_id: null, status: 'pending', sender: 'me' },
        { agent_id: 'a1', status: 'pending', sender: 'me' },
      ]),
    );
    const { result } = renderHook(() => useAgentPendingCounts(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.counts).toEqual({ a1: 1 });
  });
});
