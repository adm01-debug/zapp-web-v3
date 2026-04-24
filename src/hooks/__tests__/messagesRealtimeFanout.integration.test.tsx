// @ts-nocheck
/**
 * Integration tests for the messages realtime fan-out.
 *
 * Goal: validate that a single INSERT/UPDATE event broadcast over
 * `postgres_changes('messages')` propagates to ALL three primary consumers
 * documented in TRILHA_MENSAGENS_NAVEGAVEL.mmd:
 *   - useRealtimeMessages   (global feed)
 *   - useMessages           (per-contact list)
 *   - useMessageStatus      (per-message status badge)
 *
 * Strategy: we mock supabase.channel so that every `.on('postgres_changes', binding, handler)`
 * call records the handler in a registry keyed by `${event}:${filter ?? ''}`.
 * The test then dispatches synthetic payloads to that registry and asserts
 * the UI state of each hook.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

// --------------------------------------------------------------------------
// Shared realtime channel mock — all hooks subscribe through this.
// --------------------------------------------------------------------------

type Handler = (payload: any) => void;
const handlers: { event: string; filter?: string; fn: Handler }[] = [];

const mockChannelInstance = {
  on: vi.fn((kind: string, binding: any, fn: Handler) => {
    handlers.push({ event: binding?.event ?? '*', filter: binding?.filter, fn });
    return mockChannelInstance;
  }),
  subscribe: vi.fn((cb?: (s: string) => void) => {
    cb?.('SUBSCRIBED');
    return mockChannelInstance;
  }),
};

const mockChannel = vi.fn(() => mockChannelInstance);
const mockRemoveChannel = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...a: any[]) => mockFrom(...a),
    channel: (...a: any[]) => mockChannel(...a),
    removeChannel: (...a: any[]) => mockRemoveChannel(...a),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } } }) },
    functions: { invoke: vi.fn() },
  },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() },
  getLogger: () => ({ error: vi.fn(), debug: vi.fn(), info: vi.fn(), warn: vi.fn() }),
}));

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

function dispatch(event: 'INSERT' | 'UPDATE' | 'DELETE', row: any, oldRow: any = null) {
  const payload = { eventType: event, new: row, old: oldRow };
  // Find every handler that matches by event (ignore filter — supabase server
  // would have filtered already; the handler shouldn't refilter).
  for (const h of handlers) {
    if (h.event === event || h.event === '*') h.fn(payload);
  }
}

function buildRow(overrides: Record<string, any> = {}) {
  return {
    id: 'msg-1',
    contact_id: 'c1',
    agent_id: null,
    content: 'Hello',
    sender: 'contact',
    message_type: 'text',
    media_url: null,
    is_read: false,
    status: 'sent',
    status_updated_at: '2026-04-24T10:00:00Z',
    created_at: '2026-04-24T10:00:00Z',
    updated_at: '2026-04-24T10:00:00Z',
    external_id: null,
    whatsapp_connection_id: null,
    transcription: null,
    transcription_status: null,
    is_deleted: false,
    error_code: null,
    error_reason: null,
    ...overrides,
  };
}

function makeMessagesPaginatedQuery(initial: any[] = []) {
  // useMessages calls: from('messages').select('*').eq().order().range()
  const range = vi.fn()
    .mockResolvedValueOnce({ data: initial, error: null })
    .mockResolvedValue({ data: [], error: null });
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({ range }),
      }),
    }),
  };
}

function makeStatusQuery(initial: any[] = []) {
  // useMessageStatus calls: from('messages').select(cols).eq('contact_id', x).eq('sender','agent').not('status','is',null)
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({ data: initial, error: null }),
        }),
      }),
    }),
  };
}

// --------------------------------------------------------------------------
// Tests — useMessages + useMessageStatus react to the SAME broadcast
// --------------------------------------------------------------------------

describe('messages realtime fan-out (integration)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.length = 0;
  });

  it('useMessages: INSERT for current contact appends the message', async () => {
    mockFrom.mockReturnValue(makeMessagesPaginatedQuery([]));
    const { useMessages } = await import('@/hooks/useMessages');
    const { result } = renderHook(() => useMessages({ contactId: 'c1' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toHaveLength(0);

    act(() => dispatch('INSERT', buildRow({ id: 'new-1', content: 'Oi' })));

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.messages[0].id).toBe('new-1');
    expect(result.current.messages[0].content).toBe('Oi');
  });

  it('useMessages: INSERT for other contact is ignored', async () => {
    mockFrom.mockReturnValue(makeMessagesPaginatedQuery([]));
    const { useMessages } = await import('@/hooks/useMessages');
    const { result } = renderHook(() => useMessages({ contactId: 'c1' }));

    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => dispatch('INSERT', buildRow({ id: 'foreign', contact_id: 'c2' })));

    expect(result.current.messages).toHaveLength(0);
  });

  it('useMessages: UPDATE replaces the matching message in place', async () => {
    const seeded = [buildRow({ id: 'm1', content: 'antes', status: 'sent' })];
    mockFrom.mockReturnValue(makeMessagesPaginatedQuery(seeded));
    const { useMessages } = await import('@/hooks/useMessages');
    const { result } = renderHook(() => useMessages({ contactId: 'c1' }));

    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => dispatch('UPDATE', buildRow({ id: 'm1', content: 'depois', status: 'delivered' })));

    await waitFor(() => expect(result.current.messages[0].status).toBe('delivered'));
    expect(result.current.messages[0].content).toBe('depois');
    expect(result.current.messages).toHaveLength(1);
  });

  it('useMessages: DELETE removes the message', async () => {
    const seeded = [buildRow({ id: 'm1' }), buildRow({ id: 'm2' })];
    mockFrom.mockReturnValue(makeMessagesPaginatedQuery(seeded));
    const { useMessages } = await import('@/hooks/useMessages');
    const { result } = renderHook(() => useMessages({ contactId: 'c1' }));

    await waitFor(() => expect(result.current.messages).toHaveLength(2));

    act(() => dispatch('DELETE', null, buildRow({ id: 'm1' })));

    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    expect(result.current.messages[0].id).toBe('m2');
  });

  it('useMessageStatus: UPDATE updates the per-message status map', async () => {
    mockFrom.mockReturnValue(makeStatusQuery([]));
    const { useMessageStatus } = await import('@/hooks/useMessageStatus');
    const { result } = renderHook(() => useMessageStatus('c1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => dispatch('UPDATE', buildRow({ id: 'm99', status: 'delivered', status_updated_at: '2026-04-24T10:00:01Z' })));

    await waitFor(() => {
      const detail = result.current.getMessageStatusDetail('m99');
      expect(detail?.status).toBe('delivered');
    });
  });

  it('fan-out: a single UPDATE reaches both useMessages and useMessageStatus', async () => {
    // useMessages gets messages-paginated query, useMessageStatus gets status query.
    // We sequence them by call order: useMessages mounts first.
    mockFrom
      .mockReturnValueOnce(makeMessagesPaginatedQuery([buildRow({ id: 'shared', status: 'sent' })]))
      .mockReturnValueOnce(makeMessagesPaginatedQuery([])) // pagination empty page
      .mockReturnValueOnce(makeStatusQuery([{ id: 'shared', status: 'sent', status_updated_at: '2026-04-24T10:00:00Z' }]));

    const { useMessages } = await import('@/hooks/useMessages');
    const { useMessageStatus } = await import('@/hooks/useMessageStatus');

    const messagesHook = renderHook(() => useMessages({ contactId: 'c1' }));
    const statusHook = renderHook(() => useMessageStatus('c1'));

    await waitFor(() => {
      expect(messagesHook.result.current.messages).toHaveLength(1);
      expect(statusHook.result.current.isLoading).toBe(false);
    });

    // The SAME broadcast event reaches both subscribers.
    act(() =>
      dispatch('UPDATE', buildRow({
        id: 'shared',
        status: 'read',
        status_updated_at: '2026-04-24T10:01:00Z',
      })),
    );

    await waitFor(() => {
      expect(messagesHook.result.current.messages[0].status).toBe('read');
      expect(statusHook.result.current.getMessageStatusDetail('shared')?.status).toBe('read');
    });
  });
});
