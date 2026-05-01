// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
}));

import { useAgentRecentSends } from '@/features/useAgentRecentSends';

function wrapper({ children }: any) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const sends = [
  { idem_key: 'msg:m1', instance_name: 'wpp2', http_status: 200, external_message_id: 'e1', created_at: '2026-01-03', path: '/message/sendText' },
  { idem_key: 'msg:m2', instance_name: 'wpp2', http_status: 200, external_message_id: 'e2', created_at: '2026-01-02', path: '/message/sendText' },
  { idem_key: 'evt:x', instance_name: 'wpp2', http_status: 200, external_message_id: null, created_at: '2026-01-01', path: '/event' },
  { idem_key: 'msg:m3', instance_name: 'wpp2', http_status: 500, external_message_id: null, created_at: '2026-01-00', path: '/message/sendText' },
];

const messages = [
  { id: 'm1', agent_id: 'agent-A' },
  { id: 'm2', agent_id: 'agent-A' },
  { id: 'm3', agent_id: null },
];

beforeEach(() => {
  mockFrom.mockReset();
  mockFrom.mockImplementation((table: string) => {
    if (table === 'evolution_send_idempotency') {
      return {
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: sends, error: null }),
          }),
        }),
      };
    }
    if (table === 'messages') {
      return {
        select: () => ({
          in: () => Promise.resolve({ data: messages, error: null }),
        }),
      };
    }
    throw new Error(`unexpected table ${table}`);
  });
});

describe('useAgentRecentSends', () => {
  it('only keeps idem keys with msg: prefix', async () => {
    const { result } = renderHook(() => useAgentRecentSends(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalSends).toBe(3);
  });

  it('groups by agent_id and ignores null assignments', async () => {
    const { result } = renderHook(() => useAgentRecentSends(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const list = result.current.byAgent.get('agent-A');
    expect(list?.length).toBe(2);
    expect(result.current.byAgent.has('null')).toBe(false);
  });

  it('caps at 5 sends per agent', async () => {
    // override with 7 msg sends for one agent
    const many = Array.from({ length: 7 }).map((_, i) => ({
      idem_key: `msg:n${i}`,
      instance_name: 'wpp2',
      http_status: 200,
      external_message_id: null,
      created_at: `2026-01-${10 + i}`,
      path: '/message/sendText',
    }));
    mockFrom.mockImplementation((table: string) => {
      if (table === 'evolution_send_idempotency') {
        return { select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: many, error: null }) }) }) };
      }
      return {
        select: () => ({
          in: () => Promise.resolve({
            data: many.map((m, i) => ({ id: `n${i}`, agent_id: 'X' })),
            error: null,
          }),
        }),
      };
    });
    const { result } = renderHook(() => useAgentRecentSends(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.byAgent.get('X')?.length).toBe(5);
  });
});
