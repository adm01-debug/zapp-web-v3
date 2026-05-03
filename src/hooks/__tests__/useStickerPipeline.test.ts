import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external deps
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: vi.fn(() => Promise.resolve({ error: null })),
        getPublicUrl: () => ({ data: { publicUrl: 'https://test.supabase.co/stickers/test.webp' } }),
        remove: vi.fn(() => Promise.resolve({ error: null })),
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'test-sticker-id' }, error: null }),
        }),
      }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'test-user' } } }),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/lib/logger', () => ({ getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }) }));
vi.mock('@/lib/stickerValidator', () => ({
  validateStickerFile: vi.fn(() => Promise.resolve({ valid: true, warnings: [], errors: [], isAnimated: false, fileSizeKB: 50, mimeType: 'image/webp' })),
  generateStickerFingerprint: vi.fn(() => Promise.resolve('fp_1024_abc')),
}));
vi.mock('@/lib/stickerConverter', () => ({
  convertToWebP: vi.fn(() => Promise.resolve({ blob: new Blob([]), wasConverted: false, sizeKB: 50 })),
}));
vi.mock('@/hooks/useBackgroundClassifier', () => ({
  useBackgroundClassifier: () => ({ classifyInBackground: vi.fn() }),
}));

import { renderHook } from '@testing-library/react';
import { useStickerPipeline } from '../useStickerPipeline';

describe('useStickerPipeline', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns processAndUpload function', () => {
    const { result } = renderHook(() => useStickerPipeline());
    expect(typeof result.current.processAndUpload).toBe('function');
  });

  it('processAndUpload does not throw for valid file', async () => {
    const { result } = renderHook(() => useStickerPipeline());
    const file = new File([new ArrayBuffer(1024)], 'test.webp', { type: 'image/webp' });
    await expect(result.current.processAndUpload(file)).resolves.toBeDefined();
  });

  it('accepts custom name option', async () => {
    const { result } = renderHook(() => useStickerPipeline());
    const file = new File([new ArrayBuffer(1024)], 'test.webp', { type: 'image/webp' });
    const res = await result.current.processAndUpload(file, { name: 'Custom Name' });
    expect(res).toBeDefined();
  });

  it('accepts skipClassification option', async () => {
    const { result } = renderHook(() => useStickerPipeline());
    const file = new File([new ArrayBuffer(1024)], 'test.webp', { type: 'image/webp' });
    const res = await result.current.processAndUpload(file, { skipClassification: true });
    expect(res).toBeDefined();
  });
});
