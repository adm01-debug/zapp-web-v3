import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => {
  const channelMock = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  };
  return {
    supabase: {
      channel: vi.fn(() => channelMock),
      removeChannel: vi.fn(),
      __channelMock: channelMock,
    },
  };
});

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import { useContactTyping } from '@/hooks/useContactTyping';
import { supabase } from '@/integrations/supabase/client';

const supabaseMock = supabase as unknown as {
  channel: ReturnType<typeof vi.fn>;
  removeChannel: ReturnType<typeof vi.fn>;
  __channelMock: { on: ReturnType<typeof vi.fn>; subscribe: ReturnType<typeof vi.fn>; unsubscribe: ReturnType<typeof vi.fn> };
};
const channelMock = supabaseMock.__channelMock;

describe('useContactTyping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    channelMock.on.mockClear().mockReturnThis();
    channelMock.subscribe.mockClear().mockReturnThis();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('subscreve no canal correto quando remoteJid é válido', () => {
    renderHook(() => useContactTyping('5511999999999@s.whatsapp.net'));
    expect(supabaseMock.channel).toHaveBeenCalledWith('typing:5511999999999@s.whatsapp.net');
    expect(channelMock.subscribe).toHaveBeenCalled();
  });

  it('não subscreve quando remoteJid é null', () => {
    renderHook(() => useContactTyping(null));
    expect(supabaseMock.channel).not.toHaveBeenCalled();
  });

  it('não subscreve quando remoteJid é vazio', () => {
    renderHook(() => useContactTyping(''));
    expect(supabaseMock.channel).not.toHaveBeenCalled();
  });

  it('ignora JID @g.us (grupo)', () => {
    renderHook(() => useContactTyping('123@g.us'));
    expect(supabaseMock.channel).not.toHaveBeenCalled();
  });

  it('ignora JID @broadcast', () => {
    renderHook(() => useContactTyping('status@broadcast'));
    expect(supabaseMock.channel).not.toHaveBeenCalled();
  });

  it('seta isTyping=true ao receber broadcast e auto-clear em 5s', () => {
    let handler: ((args: { payload: unknown }) => void) | null = null;
    channelMock.on.mockImplementation((_evt: string, _filter: unknown, cb: typeof handler) => {
      handler = cb;
      return channelMock;
    });

    const { result } = renderHook(() => useContactTyping('5511999999999@s.whatsapp.net'));
    expect(result.current).toBe(false);

    act(() => {
      handler?.({ payload: { isTyping: true } });
    });
    expect(result.current).toBe(true);

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(false);
  });

  it('cleanup remove canal ao desmontar', () => {
    const { unmount } = renderHook(() => useContactTyping('5511999999999@s.whatsapp.net'));
    unmount();
    expect(supabaseMock.removeChannel).toHaveBeenCalled();
  });
});
