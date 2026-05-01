import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock useAuth
vi.mock('@/features/auth', () => ({
  useAuth: () => ({ profile: { id: 'agent-1', user_id: 'u1' } }),
}));

// Mock external client
const onMock = vi.fn();
const subscribeMock = vi.fn();
const removeChannelMock = vi.fn();
const rpcMock = vi.fn();
let capturedHandler: ((m: { payload: unknown }) => void) | null = null;

const channelMock = {
  on: (_t: string, _f: unknown, handler: (m: { payload: unknown }) => void) => {
    capturedHandler = handler;
    onMock(_t, _f, handler);
    return channelMock;
  },
  subscribe: () => {
    subscribeMock();
    return channelMock;
  },
};

vi.mock('@/integrations/supabase/externalClient', () => ({
  isExternalConfigured: true,
  externalSupabase: {
    channel: () => channelMock,
    removeChannel: (...a: unknown[]) => removeChannelMock(...a),
    rpc: (...a: unknown[]) => rpcMock(...a),
  },
}));

import { useIncomingCallBroadcast } from '@/features/inbox';

describe('useIncomingCallBroadcast', () => {
  beforeEach(() => {
    onMock.mockClear();
    subscribeMock.mockClear();
    removeChannelMock.mockClear();
    rpcMock.mockReset();
    capturedHandler = null;
  });

  it('subscribes to incoming-calls channel on mount', () => {
    renderHook(() => useIncomingCallBroadcast());
    expect(onMock).toHaveBeenCalled();
    expect(subscribeMock).toHaveBeenCalled();
  });

  it('resolves contact and sets incomingCall when broadcast matches agent', async () => {
    rpcMock.mockResolvedValue({
      data: [{ id: 'c1', push_name: 'Alice', phone: '5511999', profile_picture_url: 'http://img/a.jpg' }],
      error: null,
    });

    const { result } = renderHook(() => useIncomingCallBroadcast());

    await act(async () => {
      capturedHandler?.({
        payload: {
          remote_jid: '5511999@s.whatsapp.net',
          agent_profile_id: 'agent-1',
          is_video: true,
          started_at: '2026-01-01T00:00:00Z',
          wa_call_id: 'call-xyz',
        },
      });
    });

    await waitFor(() => {
      expect(result.current.incomingCall).not.toBeNull();
    });
    expect(result.current.incomingCall?.contact_name).toBe('Alice');
    expect(result.current.incomingCall?.contact_avatar_url).toBe('http://img/a.jpg');
    expect(result.current.incomingCall?.is_video).toBe(true);
    expect(result.current.incomingCall?.id).toBe('call-xyz');
  });

  it('ignores broadcast for a different agent', async () => {
    const { result } = renderHook(() => useIncomingCallBroadcast());

    await act(async () => {
      capturedHandler?.({
        payload: {
          remote_jid: '5511888@s.whatsapp.net',
          agent_profile_id: 'agent-OTHER',
          is_video: false,
        },
      });
    });

    expect(rpcMock).not.toHaveBeenCalled();
    expect(result.current.incomingCall).toBeNull();
  });

  it('falls back to phone when rpc_get_contact fails', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const { result } = renderHook(() => useIncomingCallBroadcast());

    await act(async () => {
      capturedHandler?.({
        payload: {
          remote_jid: '5511777@s.whatsapp.net',
          agent_profile_id: 'agent-1',
          is_video: false,
        },
      });
    });

    await waitFor(() => {
      expect(result.current.incomingCall).not.toBeNull();
    });
    expect(result.current.incomingCall?.contact_name).toBe('5511777');
    expect(result.current.incomingCall?.contact_phone).toBe('5511777');
  });

  it('ignores @broadcast jids', async () => {
    const { result } = renderHook(() => useIncomingCallBroadcast());

    await act(async () => {
      capturedHandler?.({
        payload: {
          remote_jid: 'status@broadcast',
          agent_profile_id: 'agent-1',
        },
      });
    });

    expect(rpcMock).not.toHaveBeenCalled();
    expect(result.current.incomingCall).toBeNull();
  });

  it('dismissCall clears state and cleanup removes channel', async () => {
    rpcMock.mockResolvedValue({ data: [{ id: 'c1', push_name: 'Bob', phone: '111' }], error: null });

    const { result, unmount } = renderHook(() => useIncomingCallBroadcast());

    await act(async () => {
      capturedHandler?.({
        payload: { remote_jid: '111@s.whatsapp.net', agent_profile_id: 'agent-1' },
      });
    });

    await waitFor(() => expect(result.current.incomingCall).not.toBeNull());

    act(() => result.current.dismissCall());
    expect(result.current.incomingCall).toBeNull();

    unmount();
    expect(removeChannelMock).toHaveBeenCalled();
  });
});
