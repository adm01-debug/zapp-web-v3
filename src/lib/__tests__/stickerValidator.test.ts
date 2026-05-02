import { describe, it, expect, vi } from 'vitest';
import { validateStickerFile, generateStickerFingerprint, STICKER_LIMITS } from '../stickerValidator';

// Mock Image for dimension testing
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 512;
  naturalHeight = 512;
  set src(_: string) {
    setTimeout(() => this.onload?.(), 0);
  }
}

globalThis.Image = MockImage as unknown as typeof Image;
globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
globalThis.URL.revokeObjectURL = vi.fn();

describe('stickerValidator', () => {
  function createMockFile(options: {
    name?: string;
    type?: string;
    size?: number;
  }): File {
    const content = new Uint8Array(options.size || 1024);
    return new File([content], options.name || 'sticker.webp', {
      type: options.type || 'image/webp',
    });
  }

  describe('validateStickerFile', () => {
    it('accepts valid WebP sticker', async () => {
      const file = createMockFile({ type: 'image/webp', size: 50 * 1024 });
      const result = await validateStickerFile(file);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects unsupported format', async () => {
      const file = createMockFile({ name: 'test.bmp', type: 'image/bmp', size: 1024 });
      const result = await validateStickerFile(file);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Formato não suportado');
    });

    it('warns about non-WebP format', async () => {
      const file = createMockFile({ type: 'image/png', size: 50 * 1024 });
      const result = await validateStickerFile(file);
      expect(result.valid).toBe(true); // Valid but with warning
      expect(result.warnings.some(w => w.includes('WebP'))).toBe(true);
    });

    it('warns about static sticker over 100KB', async () => {
      const file = createMockFile({ type: 'image/webp', size: 150 * 1024 });
      const result = await validateStickerFile(file);
      expect(result.warnings.some(w => w.includes('100KB'))).toBe(true);
    });

    it('detects GIF as animated', async () => {
      const file = createMockFile({ type: 'image/gif', size: 200 * 1024 });
      const result = await validateStickerFile(file);
      expect(result.isAnimated).toBe(true);
    });

    it('reports correct file size', async () => {
      const file = createMockFile({ size: 256 * 1024 });
      const result = await validateStickerFile(file);
      expect(result.fileSizeKB).toBe(256);
    });
  });

  describe('generateStickerFingerprint', () => {
    it('generates deterministic fingerprint', async () => {
      const file = createMockFile({ size: 1024 });
      const fp1 = await generateStickerFingerprint(file);
      const fp2 = await generateStickerFingerprint(file);
      expect(fp1).toBe(fp2);
    });

    it('includes file size in fingerprint', async () => {
      const file = createMockFile({ size: 5000 });
      const fp = await generateStickerFingerprint(file);
      expect(fp).toContain('5000');
    });

    it('generates different fingerprints for different sizes', async () => {
      const file1 = createMockFile({ size: 1024 });
      const file2 = createMockFile({ size: 2048 });
      const fp1 = await generateStickerFingerprint(file1);
      const fp2 = await generateStickerFingerprint(file2);
      expect(fp1).not.toBe(fp2);
    });
  });

  describe('STICKER_LIMITS', () => {
    it('has correct WhatsApp limits', () => {
      expect(STICKER_LIMITS.STATIC_MAX_KB).toBe(100);
      expect(STICKER_LIMITS.ANIMATED_MAX_KB).toBe(500);
      expect(STICKER_LIMITS.RECOMMENDED_SIZE_PX).toBe(512);
    });
  });
});
