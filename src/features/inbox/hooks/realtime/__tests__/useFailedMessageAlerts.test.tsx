import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const handlers: Array<(payload: unknown) => void> = [];
  const subscribe = vi.fn(() => ({}));
  const channelObj = {
    on: (_evt: string, _filter: unknown, cb: (p: unknown) => void) => {
      handlers.push(cb);
      return { subscribe };
    },
  };
  return {
    __handlers: handlers,
    __subscribe: subscribe,
    supabase: {
      channel: () => channelObj,
      removeChannel: vi.fn(),
    },
  };
});

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
vi.mock('@/lib/logger', () => ({ getLogger: () => ({ warn: vi.fn(), info: vi.fn() }) }));

import { useFailedMessageAlerts } from '@/features/inbox/hooks/realtime/useFailedMessageAlerts';
import * as supabaseMock from '@/integrations/supabase/client';
import { toast } from 'sonner';

const handlers = (supabaseMock as unknown as { __handlers: Array<(p: unknown) => void> }).__handlers;
const toastError = toast.error as unknown as ReturnType<typeof vi.fn>;

describe('useFailedMessageAlerts', () => {
  beforeEach(() => {
    handlers.length = 0;
    toastError.mockClear();
  });

  it('dispara toast quando status passa para abandoned', () => {
    renderHook(() => useFailedMessageAlerts(true));
    handlers[0]({
      new: { id: 'a1', status: 'abandoned', instance_name: 'wpp2', remote_jid: '5511@x', error_code: 'http_503', retry_count: 5 },
      old: { id: 'a1', status: 'retrying' },
    });
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(String(toastError.mock.calls[0][0])).toMatch(/abandonada/i);
  });

  it('ignora updates que não são para status abandoned', () => {
    renderHook(() => useFailedMessageAlerts(true));
    handlers[0]({
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
    handlers[0](payload);
    handlers[0](payload);
    expect(toastError).toHaveBeenCalledTimes(1);
  });

  it('não monta canal quando enabled=false', () => {
    renderHook(() => useFailedMessageAlerts(false));
    expect(handlers.length).toBe(0);
  });
});
