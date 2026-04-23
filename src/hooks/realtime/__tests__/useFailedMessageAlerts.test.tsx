import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const channelHandlers: Array<(payload: unknown) => void> = [];
const removeChannel = vi.fn();
const subscribe = vi.fn(() => ({}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: () => ({
      on: (_evt: string, _filter: unknown, cb: (p: unknown) => void) => {
        channelHandlers.push(cb);
        return {
          on: (_e: string, _f: unknown, cb2: (p: unknown) => void) => {
            channelHandlers.push(cb2);
            return { subscribe };
          },
          subscribe,
        };
      },
    }),
    removeChannel,
  },
}));

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

vi.mock('@/lib/logger', () => ({ getLogger: () => ({ warn: vi.fn(), info: vi.fn() }) }));

import { useFailedMessageAlerts } from '../useFailedMessageAlerts';

describe('useFailedMessageAlerts', () => {
  beforeEach(() => {
    channelHandlers.length = 0;
    toastError.mockClear();
    removeChannel.mockClear();
  });

  it('dispara toast quando status passa para abandoned', () => {
    renderHook(() => useFailedMessageAlerts(true));
    channelHandlers[0]({
      new: { id: 'a1', status: 'abandoned', instance_name: 'wpp2', remote_jid: '5511@x', error_code: 'http_503', retry_count: 5 },
      old: { id: 'a1', status: 'retrying' },
    });
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(String(toastError.mock.calls[0][0])).toMatch(/abandonada/i);
  });

  it('ignora updates que não são para status abandoned', () => {
    renderHook(() => useFailedMessageAlerts(true));
    channelHandlers[0]({
      new: { id: 'b1', status: 'retrying', error_code: 'timeout', retry_count: 2 },
      old: { id: 'b1', status: 'pending' },
    });
    expect(toastError).not.toHaveBeenCalled();
  });

  it('deduplica re-entregas do mesmo id', () => {
    renderHook(() => useFailedMessageAlerts(true));
    const payload = {
      new: { id: 'c1', status: 'abandoned', error_code: null, retry_count: 5 },
      old: { id: 'c1', status: 'retrying' },
    };
    channelHandlers[0](payload);
    channelHandlers[0](payload);
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('não monta canal quando enabled=false', () => {
    renderHook(() => useFailedMessageAlerts(false));
    expect(channelHandlers.length).toBe(0);
  });
});
