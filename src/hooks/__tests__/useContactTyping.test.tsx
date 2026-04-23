import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import { useContactTyping } from '@/hooks/useContactTyping';
import { supabase } from '@/integrations/supabase/client';

describe('useContactTyping', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    (supabase.channel as ReturnType<typeof vi.fn>).mockClear();
    (supabase.removeChannel as ReturnType<typeof vi.fn>).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('subscreve no canal correto quando remoteJid é válido', () => {
    renderHook(() => useContactTyping('5511999999999@s.whatsapp.net'));
    expect(supabase.channel).toHaveBeenCalledWith('typing:5511999999999@s.whatsapp.net');
  });

  it('não subscreve quando remoteJid é null', () => {
    renderHook(() => useContactTyping(null));
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('não subscreve quando remoteJid é vazio', () => {
    renderHook(() => useContactTyping(''));
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('ignora JID @g.us (grupo)', () => {
    renderHook(() => useContactTyping('123@g.us'));
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('ignora JID @broadcast', () => {
    renderHook(() => useContactTyping('status@broadcast'));
    expect(supabase.channel).not.toHaveBeenCalled();
  });

  it('seta isTyping=true ao receber broadcast e auto-clear em 5s', () => {
    let handler: ((args: { payload: unknown }) => void) | null = null;
    const channelObj = {
      on: vi.fn((_evt: string, _filter: unknown, cb: typeof handler) => {
        handler = cb;
        return channelObj;
      }),
      subscribe: vi.fn().mockReturnThis(),
      unsubscribe: vi.fn(),
    };
    (supabase.channel as ReturnType<typeof vi.fn>).mockReturnValueOnce(channelObj);

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
    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});
