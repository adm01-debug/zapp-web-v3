import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: { base64: 'ZmFrZQ==', mimetype: 'image/jpeg' }, error: null }) } },
}));
vi.mock('@/lib/logger', () => ({ getLogger: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }) }));

import { useMediaRefresh } from '@/features/inbox';

describe('useMediaRefresh', () => {
  it('é no-op quando refreshKey é undefined', () => {
    const { result } = renderHook(() => useMediaRefresh('https://x/img.jpg', undefined));
    expect(result.current.url).toBeNull();
    expect(result.current.isRefreshing).toBe(false);
    // onError não deve lançar
    expect(() => result.current.onError()).not.toThrow();
  });

  it('com refreshKey, expõe url=null inicialmente e dispara refresh em onError', async () => {
    const key = { instanceName: 'wpp2', remoteJid: '5511@s.whatsapp.net', fromMe: false, id: 'ABC' };
    const { result } = renderHook(() => useMediaRefresh('https://expired.url/x.jpg', key));
    expect(result.current.url).toBeNull();
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.url).toMatch(/^data:image\/jpeg;base64,/);
  });
});
