import { describe, it, expect, vi, beforeEach } from 'vitest';
import { convertToWebP } from '../stickerConverter';

// Mock canvas and image
class MockCanvas {
  width = 0;
  height = 0;
  getContext() {
    return {
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      drawImage: vi.fn(),
    };
  }
  toBlob(cb: (blob: Blob | null) => void, type: string, quality: number) {
    // Create a small blob to simulate WebP output
    const size = Math.round(50 * 1024 * quality); // ~50KB at full quality
    cb(new Blob([new ArrayBuffer(size)], { type }));
  }
}

class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 800;
  naturalHeight = 600;
  src = '';
  set _src(val: string) {
    this.src = val;
    setTimeout(() => this.onload?.(), 0);
  }
}

vi.stubGlobal('Image', class {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 800;
  naturalHeight = 600;
  src = '';
  constructor() {
    setTimeout(() => this.onload?.(), 0);
  }
});

vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'blob:mock'),
  revokeObjectURL: vi.fn(),
});

const mockCanvas = new MockCanvas();
vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLElement);

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

describe('stickerConverter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips conversion for small WebP files', async () => {
    const file = new File([new ArrayBuffer(50 * 1024)], 'sticker.webp', {
      type: 'image/webp',
    });
    const result = await convertToWebP(file);
    expect(result.wasConverted).toBe(false);
    expect(result.originalFormat).toBe('image/webp');
  });

  it('converts PNG to WebP', async () => {
    const file = new File([new ArrayBuffer(200 * 1024)], 'sticker.png', {
      type: 'image/png',
    });
    const result = await convertToWebP(file);
    expect(result.wasConverted).toBe(true);
    expect(result.originalFormat).toBe('image/png');
    expect(result.blob.type).toBe('image/webp');
  });

  it('converts JPEG to WebP', async () => {
    const file = new File([new ArrayBuffer(150 * 1024)], 'photo.jpg', {
      type: 'image/jpeg',
    });
    const result = await convertToWebP(file);
    expect(result.wasConverted).toBe(true);
    expect(result.originalFormat).toBe('image/jpeg');
  });

  it('returns correct size in KB', async () => {
    const file = new File([new ArrayBuffer(50 * 1024)], 'small.webp', {
      type: 'image/webp',
    });
    const result = await convertToWebP(file);
    expect(result.sizeKB).toBe(50);
  });
});
