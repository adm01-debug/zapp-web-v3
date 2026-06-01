/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockChannel = vi.fn().mockReturnValue({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
});
const mockRemoveChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: (...args: any[]) => mockRemoveChannel(...args),
  },
}));

const mockDbList = vi.fn().mockResolvedValue({ data: [], error: null, correlationId: 'test' });
vi.mock('@/integrations/datasource/db', () => ({
  dbList: (...args: any[]) => mockDbList(...args),
  dbFrom: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockResolvedValue({ data: [], error: null }),
  })),
  dbTable: vi.fn((entity: string) => entity),
  dbClient: vi.fn(() => ({})),
  dbGet: vi.fn().mockResolvedValue({ data: null, error: null, correlationId: 'test' }),
  dbInsert: vi.fn().mockResolvedValue({ data: null, error: null, correlationId: 'test' }),
  dbChannel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() })),
  dbRemoveChannel: vi.fn(),
}));

vi.mock('@/lib/logger', () => {
  const makeLog = () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() });
  return {
    log: makeLog(),
    logger: makeLog(),
    createLogger: vi.fn(() => makeLog()),
    getLogger: vi.fn(() => makeLog()),
    generateCorrelationId: vi.fn(() => 'test-id'),
    getSessionId: vi.fn(() => 'test-session'),
    logPerformance: vi.fn(),
    logAsyncPerformance: vi.fn(),
  };
});

import { useMessages } from '@/hooks/useMessages';

const baseRow = {
  id: 'msg-1',
  message_id: 'msg-1',
  remote_jid: 'c1@s.whatsapp.net',
  contact_id: 'c1',
  content: 'Hello',
  sender: 'contact',
  created_at: '2024-01-01T00:00:00Z',
  timestamp: '2024-01-01T00:00:00Z',
  media_url: null,
  media_type: null,
  quoted_message_id: null,
  is_starred: false,
  is_important: false,
  category: null,
  sentiment: null,
  tags: [],
  notes: null,
  follow_up_at: null,
  follow_up_done: false,
  status: 1,
};

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbList.mockResolvedValue({ data: [], error: null, correlationId: 'test' });
    mockChannel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    });
  });

  it('returns empty messages when remoteJid is null', async () => {
    const { result } = renderHook(() => useMessages(null));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toEqual([]);
  });

  it('fetches messages when remoteJid is provided', async () => {
    mockDbList.mockResolvedValueOnce({ data: [baseRow], error: null, correlationId: 'test' });

    const { result } = renderHook(() => useMessages('c1@s.whatsapp.net'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.messages).toHaveLength(1);
  });

  it('handles fetch errors gracefully', async () => {
    mockDbList.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useMessages('c1@s.whatsapp.net'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('does not fetch when remoteJid is null', async () => {
    renderHook(() => useMessages(null));
    expect(mockDbList).not.toHaveBeenCalled();
  });

  it('stops loading new messages when remoteJid changes to null', async () => {
    mockDbList.mockResolvedValueOnce({ data: [baseRow], error: null, correlationId: 'test' });

    const { result, rerender } = renderHook(({ jid }: { jid: string | null }) => useMessages(jid), {
      initialProps: { jid: 'c1@s.whatsapp.net' as string | null },
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const callCountBefore = mockDbList.mock.calls.length;
    rerender({ jid: null });

    // After switching to null, no additional fetches happen
    expect(mockDbList.mock.calls.length).toBe(callCountBefore);
  });
});
