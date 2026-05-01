import { describe, it, expect, beforeEach, vi } from 'vitest';
import { audioPlaybackBus } from '@/features/inbox';

describe('audioPlaybackBus — atalho de mute global', () => {
  beforeEach(() => audioPlaybackBus._reset());

  it('toggleMuteActive é noop quando não há player ativo', () => {
    expect(audioPlaybackBus.toggleMuteActive()).toBeNull();
    expect(audioPlaybackBus.getActive()).toBeNull();
  });

  it('setActive registra handle e toggleMuteActive aciona o callback', () => {
    const toggleMute = vi.fn(() => ({ muted: true, volume: 0 }));
    audioPlaybackBus.setActive({
      messageId: 'm1', toggleMute, getVolume: () => 0.8,
    });
    const result = audioPlaybackBus.toggleMuteActive();
    expect(toggleMute).toHaveBeenCalledOnce();
    expect(result).toEqual({ muted: true, volume: 0 });
  });

  it('último setActive substitui o anterior', () => {
    const t1 = vi.fn(() => ({ muted: true, volume: 0 }));
    const t2 = vi.fn(() => ({ muted: false, volume: 0.5 }));
    audioPlaybackBus.setActive({ messageId: 'a', toggleMute: t1, getVolume: () => 1 });
    audioPlaybackBus.setActive({ messageId: 'b', toggleMute: t2, getVolume: () => 0.5 });
    audioPlaybackBus.toggleMuteActive();
    expect(t1).not.toHaveBeenCalled();
    expect(t2).toHaveBeenCalledOnce();
  });

  it('clearActive só remove se messageId bate (idempotente para outros)', () => {
    const t = vi.fn(() => ({ muted: false, volume: 1 }));
    audioPlaybackBus.setActive({ messageId: 'x', toggleMute: t, getVolume: () => 1 });
    audioPlaybackBus.clearActive('outro'); // não bate
    expect(audioPlaybackBus.getActive()?.messageId).toBe('x');
    audioPlaybackBus.clearActive('x');
    expect(audioPlaybackBus.getActive()).toBeNull();
  });

  it('subscribe recebe handle ativo nas mudanças', () => {
    const events: Array<string | null> = [];
    const unsub = audioPlaybackBus.subscribe((a) => events.push(a?.messageId ?? null));
    audioPlaybackBus.setActive({
      messageId: 'a', toggleMute: () => ({ muted: false, volume: 1 }), getVolume: () => 1,
    });
    audioPlaybackBus.clearActive('a');
    expect(events).toEqual(['a', null]);
    unsub();
  });
});
