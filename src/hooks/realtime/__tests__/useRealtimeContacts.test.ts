import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/integrations/supabase/externalClient', () => {
  const channelOn = vi.fn();
  const channelSubscribe = vi.fn();
  const removeChannel = vi.fn();
  const state: { handler: ((p: any) => void) | null } = { handler: null };
  const channel: any = {
    on: (...args: any[]) => {
      channelOn(...args);
      state.handler = args[2] as (p: any) => void;
      return channel;
    },
    subscribe: (...args: any[]) => {
      channelSubscribe(...args);
      return channel;
    },
  };
  const channelFn = vi.fn(() => channel);
  return {
    isExternalConfigured: true,
    externalSupabase: {
      channel: channelFn,
      removeChannel,
    },
    __test: { channelOn, channelSubscribe, removeChannel, channelFn, state },
  };
});

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRealtimeContacts } from '../useRealtimeContacts';
import * as externalClientMod from '@/integrations/supabase/externalClient';

const mocks = (externalClientMod as any).__test as {
  channelOn: ReturnType<typeof vi.fn>;
  channelSubscribe: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
  channelFn: ReturnType<typeof vi.fn>;
  state: { handler: ((p: any) => void) | null };
};

function makeWrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function makeContact(overrides: Partial<any> = {}) {
  return {
    id: 'c1',
    remote_jid: '5511999999999@s.whatsapp.net',
    push_name: 'Alice',
    profile_picture_url: null,
    instance_name: 'wpp2',
    is_group: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

describe('useRealtimeContacts', () => {
  let qc: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    capturedHandler = null;
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('subscribes to the per-instance channel on mount', () => {
    renderHook(() => useRealtimeContacts({ instance: 'wpp2' }), { wrapper: makeWrapper(qc) });
    expect(channelFn).toHaveBeenCalledWith('realtime:evolution_contacts:wpp2');
    expect(channelOn).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        event: '*',
        schema: 'public',
        table: 'evolution_contacts',
        filter: 'instance_name=eq.wpp2',
      }),
      expect.any(Function),
    );
    expect(channelSubscribe).toHaveBeenCalled();
  });

  it('does not subscribe when disabled', () => {
    renderHook(() => useRealtimeContacts({ enabled: false }), { wrapper: makeWrapper(qc) });
    expect(channelFn).not.toHaveBeenCalled();
  });

  it('ignores payloads from other instances', () => {
    renderHook(() => useRealtimeContacts({ instance: 'wpp2' }), { wrapper: makeWrapper(qc) });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    capturedHandler!({
      eventType: 'UPDATE',
      new: makeContact({ instance_name: 'other' }),
      old: null,
    });
    vi.advanceTimersByTime(150);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('ignores broadcast JIDs', () => {
    renderHook(() => useRealtimeContacts({ instance: 'wpp2' }), { wrapper: makeWrapper(qc) });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    capturedHandler!({
      eventType: 'UPDATE',
      new: makeContact({ remote_jid: 'status@broadcast' }),
      old: null,
    });
    vi.advanceTimersByTime(150);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('UPDATE invalidates conversations cache after debounce when no list entry', () => {
    renderHook(() => useRealtimeContacts({ instance: 'wpp2' }), { wrapper: makeWrapper(qc) });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    capturedHandler!({ eventType: 'UPDATE', new: makeContact(), old: null });
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['external-evolution', 'conversations'] });
  });

  it('UPDATE patches individual contact cache in place', () => {
    qc.setQueryData(['contact', '5511999999999@s.whatsapp.net'], makeContact({ push_name: 'Old' }));
    renderHook(() => useRealtimeContacts({ instance: 'wpp2' }), { wrapper: makeWrapper(qc) });
    capturedHandler!({
      eventType: 'UPDATE',
      new: makeContact({ push_name: 'NewName' }),
      old: null,
    });
    vi.advanceTimersByTime(100);
    const cached = qc.getQueryData<any>(['contact', '5511999999999@s.whatsapp.net']);
    expect(cached?.push_name).toBe('NewName');
  });

  it('soft delete invalidates the list', () => {
    renderHook(() => useRealtimeContacts({ instance: 'wpp2' }), { wrapper: makeWrapper(qc) });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    capturedHandler!({
      eventType: 'UPDATE',
      new: makeContact({ deleted_at: '2025-01-02T00:00:00Z' }),
      old: null,
    });
    vi.advanceTimersByTime(100);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['external-evolution', 'conversations'] });
  });

  it('coalesces multiple updates within debounce window', () => {
    renderHook(() => useRealtimeContacts({ instance: 'wpp2' }), { wrapper: makeWrapper(qc) });
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    capturedHandler!({ eventType: 'UPDATE', new: makeContact({ push_name: 'A' }), old: null });
    capturedHandler!({ eventType: 'UPDATE', new: makeContact({ push_name: 'B' }), old: null });
    capturedHandler!({ eventType: 'UPDATE', new: makeContact({ push_name: 'C' }), old: null });
    vi.advanceTimersByTime(100);
    // Single coalesced flush -> conversations invalidate fired once
    const calls = invalidate.mock.calls.filter(
      ([arg]) =>
        arg &&
        Array.isArray((arg as any).queryKey) &&
        (arg as any).queryKey[0] === 'external-evolution',
    );
    expect(calls.length).toBe(1);
  });

  it('cleans up channel on unmount', () => {
    const { unmount } = renderHook(() => useRealtimeContacts({ instance: 'wpp2' }), {
      wrapper: makeWrapper(qc),
    });
    unmount();
    expect(removeChannel).toHaveBeenCalled();
  });
});
