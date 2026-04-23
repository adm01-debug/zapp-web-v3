import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const rpcMock = vi.fn();
const removeChannelMock = vi.fn();
const subscribeMock = vi.fn();

type RealtimeHandler = (payload: { new?: unknown; old?: unknown }) => void;
const handlers: { event: string; cb: RealtimeHandler }[] = [];

const channelMock = {
  on: (_kind: string, cfg: { event: string }, cb: RealtimeHandler) => {
    handlers.push({ event: cfg.event, cb });
    return channelMock;
  },
  subscribe: () => {
    subscribeMock();
    return channelMock;
  },
};

// rpc returns a thenable so `await externalSupabase.rpc(...)` resolves to {data,error}.
// We also expose `.abortSignal()` returning the same builder.
function makeRpcBuilder(result: { data: unknown; error: unknown }) {
  const builder: {
    abortSignal: (s: AbortSignal) => typeof builder;
    then: <T>(cb: (v: { data: unknown; error: unknown }) => T) => Promise<T>;
  } = {
    abortSignal: () => builder,
    then: (cb) => Promise.resolve(cb(result)),
  };
  return builder;
}

vi.mock('@/integrations/supabase/externalClient', () => ({
  isExternalConfigured: true,
  externalSupabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    channel: () => channelMock,
    removeChannel: (...a: unknown[]) => removeChannelMock(...a),
  },
}));

import { useMessagesCursor } from '../useMessagesCursor';

function makeMessage(id: string, createdAtIso: string) {
  return {
    id,
    message_id: id,
    remote_jid: '5511999@s.whatsapp.net',
    from_me: false,
    message_type: 'text',
    content: `msg ${id}`,
    created_at: createdAtIso,
    direction: 'inbound',
    status: 'read',
    sent_by_bot: false,
    instance_name: 'wpp2',
    is_starred: false,
    is_important: false,
    follow_up_done: false,
    media_url: null,
    media_mimetype: null,
    media_type: null,
    media_filename: null,
    media_size: null,
    caption: null,
    quoted_message_id: null,
    category: null,
    sentiment: null,
    tags: null,
    notes: null,
    follow_up_at: null,
    payload: null,
    raw_data: null,
    contact_id: null,
    conversation_id: null,
    status_at: null,
    template_name: null,
    push_name: null,
    deleted_at: null,
  };
}

const JID = '5511999@s.whatsapp.net';

describe('useMessagesCursor', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    removeChannelMock.mockClear();
    subscribeMock.mockClear();
    handlers.length = 0;
  });

  it('first load returns pageSize messages and hasMoreOlder=true when full page', async () => {
    const page = Array.from({ length: 3 }, (_, i) =>
      // RPC returns DESC: newest first
      makeMessage(`m${3 - i}`, `2026-04-23T10:0${3 - i}:00Z`),
    );
    rpcMock.mockReturnValueOnce(makeRpcBuilder({ data: page, error: null }));

    const { result } = renderHook(() =>
      useMessagesCursor({ remoteJid: JID, pageSize: 3 }),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.messages).toHaveLength(3);
    // ASC order
    expect(result.current.messages[0].id).toBe('m1');
    expect(result.current.messages[2].id).toBe('m3');
    expect(result.current.hasMoreOlder).toBe(true);
  });

  it('hasMoreOlder=false when RPC returns fewer than pageSize rows', async () => {
    rpcMock.mockReturnValueOnce(
      makeRpcBuilder({ data: [makeMessage('m1', '2026-01-01T00:00:00Z')], error: null }),
    );
    const { result } = renderHook(() =>
      useMessagesCursor({ remoteJid: JID, pageSize: 50 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMoreOlder).toBe(false);
  });

  it('loadOlder uses oldest created_at as p_before_date and prepends', async () => {
    // First page: 2 messages
    rpcMock.mockReturnValueOnce(
      makeRpcBuilder({
        data: [
          makeMessage('m2', '2026-04-23T10:02:00Z'),
          makeMessage('m1', '2026-04-23T10:01:00Z'),
        ],
        error: null,
      }),
    );

    const { result } = renderHook(() =>
      useMessagesCursor({ remoteJid: JID, pageSize: 2 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMoreOlder).toBe(true);
    expect(result.current.messages[0].id).toBe('m1');

    // loadOlder returns 2 older
    rpcMock.mockReturnValueOnce(
      makeRpcBuilder({
        data: [
          makeMessage('m0b', '2026-04-23T10:00:30Z'),
          makeMessage('m0a', '2026-04-23T10:00:00Z'),
        ],
        error: null,
      }),
    );

    await act(async () => {
      await result.current.loadOlder();
    });

    // Second rpc call carries the cursor
    const secondCall = rpcMock.mock.calls[1];
    expect(secondCall[0]).toBe('rpc_list_messages');
    expect(secondCall[1].p_before_date).toBe('2026-04-23T10:01:00Z');

    expect(result.current.messages.map((m) => m.id)).toEqual(['m0a', 'm0b', 'm1', 'm2']);
  });

  it('concurrent loadOlder calls collapse into one RPC (in-flight lock)', async () => {
    rpcMock.mockReturnValueOnce(
      makeRpcBuilder({
        data: [makeMessage('m1', '2026-04-23T10:01:00Z')],
        error: null,
      }),
    );
    const { result } = renderHook(() =>
      useMessagesCursor({ remoteJid: JID, pageSize: 1 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Make second-page rpc resolve later by returning a delayed thenable.
    let resolveSecond: ((v: { data: unknown; error: unknown }) => void) | null = null;
    rpcMock.mockReturnValueOnce({
      abortSignal: function () { return this; },
      then(cb: (v: { data: unknown; error: unknown }) => unknown) {
        return new Promise((res) => {
          resolveSecond = (v) => res(cb(v));
        });
      },
    });

    await act(async () => {
      void result.current.loadOlder();
      void result.current.loadOlder();
      void result.current.loadOlder();
    });

    // 1 call para a primeira pagina + 1 para o loadOlder (os outros dois ignorados)
    expect(rpcMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveSecond?.({ data: [], error: null });
    });
  });

  it('cancelLoadOlder aborts in-flight fetch and clears loadingOlder', async () => {
    rpcMock.mockReturnValueOnce(
      makeRpcBuilder({
        data: [makeMessage('m1', '2026-04-23T10:01:00Z')],
        error: null,
      }),
    );
    const { result } = renderHook(() =>
      useMessagesCursor({ remoteJid: JID, pageSize: 1 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Pending second call
    rpcMock.mockReturnValueOnce({
      abortSignal: function () { return this; },
      then() {
        // Never resolves until aborted in test scenario — return a never-settling promise.
        return new Promise(() => {});
      },
    });

    act(() => { void result.current.loadOlder(); });
    await waitFor(() => expect(result.current.loadingOlder).toBe(true));

    act(() => { result.current.cancelLoadOlder(); });
    await waitFor(() => expect(result.current.loadingOlder).toBe(false));
  });

  it('realtime INSERT appends to the last page and dedupes', async () => {
    rpcMock.mockReturnValueOnce(
      makeRpcBuilder({
        data: [makeMessage('m1', '2026-04-23T10:01:00Z')],
        error: null,
      }),
    );
    const { result } = renderHook(() =>
      useMessagesCursor({ remoteJid: JID, pageSize: 50 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    const insertHandler = handlers.find((h) => h.event === 'INSERT')?.cb;
    expect(insertHandler).toBeDefined();

    act(() => {
      insertHandler!({ new: makeMessage('m2', '2026-04-23T10:05:00Z') });
    });
    expect(result.current.messages.map((m) => m.id)).toEqual(['m1', 'm2']);

    // Dedup: same id again should not duplicate
    act(() => {
      insertHandler!({ new: makeMessage('m2', '2026-04-23T10:05:00Z') });
    });
    expect(result.current.messages).toHaveLength(2);
  });

  it('changing remoteJid resets state and triggers a fresh first load', async () => {
    rpcMock.mockReturnValueOnce(
      makeRpcBuilder({
        data: [makeMessage('m1', '2026-04-23T10:01:00Z')],
        error: null,
      }),
    );
    const { result, rerender } = renderHook(
      ({ jid }: { jid: string }) =>
        useMessagesCursor({ remoteJid: jid, pageSize: 50 }),
      { initialProps: { jid: JID } },
    );
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    rpcMock.mockReturnValueOnce(
      makeRpcBuilder({
        data: [makeMessage('z1', '2026-04-23T11:00:00Z')],
        error: null,
      }),
    );
    rerender({ jid: '5511888@s.whatsapp.net' });

    await waitFor(() => {
      expect(result.current.messages.map((m) => m.id)).toEqual(['z1']);
    });
  });

  it('dedupes messages already present across pages', async () => {
    rpcMock.mockReturnValueOnce(
      makeRpcBuilder({
        data: [
          makeMessage('m2', '2026-04-23T10:02:00Z'),
          makeMessage('m1', '2026-04-23T10:01:00Z'),
        ],
        error: null,
      }),
    );
    const { result } = renderHook(() =>
      useMessagesCursor({ remoteJid: JID, pageSize: 2 }),
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Older page returns a row that overlaps with m1 (same id)
    rpcMock.mockReturnValueOnce(
      makeRpcBuilder({
        data: [
          makeMessage('m1', '2026-04-23T10:01:00Z'),
          makeMessage('m0', '2026-04-23T10:00:00Z'),
        ],
        error: null,
      }),
    );

    await act(async () => {
      await result.current.loadOlder();
    });

    const ids = result.current.messages.map((m) => m.id);
    expect(ids).toEqual(['m0', 'm1', 'm2']);
  });
});
