/**
 * Sticker validation and processing utilities.
 *
 * Handles WhatsApp sticker requirements:
 * - Format: WebP required (static or animated)
 * - Static: max 100KB, 512x512px recommended
 * - Animated: max 500KB, 512x512px recommended
 * - Dimensions: must be square or near-square
 *
 * Also provides duplicate detection via image hashing.
 */

import { log } from '@/lib/logger';

/** WhatsApp sticker size limits */
export const STICKER_LIMITS = {
  STATIC_MAX_KB: 100,
  ANIMATED_MAX_KB: 500,
  UPLOAD_MAX_KB: 500, // Our upload limit (covers both)
  RECOMMENDED_SIZE_PX: 512,
  MIN_SIZE_PX: 100,
  MAX_SIZE_PX: 2048,
} as const;

export interface StickerValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
  dimensions?: { width: number; height: number };
  isAnimated: boolean;
  fileSizeKB: number;
  mimeType: string;
}

/**
 * Validates a file for WhatsApp sticker compatibility.
 * Returns detailed validation results with warnings and errors.
 */
export async function validateStickerFile(file: File): Promise<StickerValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const fileSizeKB = Math.round(file.size / 1024);
  const mimeType = file.type;
  let isAnimated = false;
  let dimensions: { width: number; height: number } | undefined;

  // Check mime type
  const acceptedTypes = ['image/webp', 'image/png', 'image/gif', 'image/jpeg'];
  if (!acceptedTypes.includes(mimeType)) {
    errors.push(`Formato não suportado: ${mimeType}. Aceitos: WebP, PNG, GIF, JPEG.`);
  }

  // Check if animated (GIF or animated WebP)
  if (mimeType === 'image/gif') {
    isAnimated = true;
  } else if (mimeType === 'image/webp') {
    // Check for animated WebP by looking for ANIM chunk
    try {
      const buffer = await file.slice(0, 64).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const text = new TextDecoder('ascii').decode(bytes);
      isAnimated = text.includes('ANIM');
    } catch {
      // Can't determine — assume static
    }
  }

  // Check file size against WhatsApp limits
  if (isAnimated && fileSizeKB > STICKER_LIMITS.ANIMATED_MAX_KB) {
    errors.push(`Sticker animado excede ${STICKER_LIMITS.ANIMATED_MAX_KB}KB (${fileSizeKB}KB).`);
  } else if (!isAnimated && fileSizeKB > STICKER_LIMITS.STATIC_MAX_KB) {
    warnings.push(`Sticker estático acima de ${STICKER_LIMITS.STATIC_MAX_KB}KB (${fileSizeKB}KB). WhatsApp pode reduzir a qualidade.`);
  }

  // Check dimensions
  try {
    dimensions = await getImageDimensions(file);
    if (dimensions) {
      const { width, height } = dimensions;

      if (width < STICKER_LIMITS.MIN_SIZE_PX || height < STICKER_LIMITS.MIN_SIZE_PX) {
        errors.push(`Imagem muito pequena: ${width}x${height}px. Mínimo: ${STICKER_LIMITS.MIN_SIZE_PX}px.`);
      }

      if (width > STICKER_LIMITS.MAX_SIZE_PX || height > STICKER_LIMITS.MAX_SIZE_PX) {
        warnings.push(`Imagem grande: ${width}x${height}px. Será redimensionada para ${STICKER_LIMITS.RECOMMENDED_SIZE_PX}px.`);
      }

      const ratio = Math.max(width, height) / Math.min(width, height);
      if (ratio > 1.5) {
        warnings.push(`Proporção não ideal (${ratio.toFixed(1)}:1). Stickers funcionam melhor quadrados.`);
      }

      if (width !== STICKER_LIMITS.RECOMMENDED_SIZE_PX || height !== STICKER_LIMITS.RECOMMENDED_SIZE_PX) {
        warnings.push(`Dimensões: ${width}x${height}px. WhatsApp recomenda ${STICKER_LIMITS.RECOMMENDED_SIZE_PX}x${STICKER_LIMITS.RECOMMENDED_SIZE_PX}px.`);
      }
    }
  } catch (err) {
    log.warn('[StickerValidator] Could not read dimensions:', err);
  }

  // Format warning for non-WebP
  if (mimeType !== 'image/webp') {
    warnings.push('Formato não é WebP. A figurinha pode aparecer como imagem comum no WhatsApp.');
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    dimensions,
    isAnimated,
    fileSizeKB,
    mimeType,
  };
}

/**
 * Gets image dimensions without loading the full image.
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Generates a simple hash for duplicate detection.
 * Uses file size + first/last 1KB of content as a fingerprint.
 */
export async function generateStickerFingerprint(file: File): Promise<string> {
  try {
    const size = file.size;
    const firstChunk = await file.slice(0, 1024).arrayBuffer();
    const lastChunk = await file.slice(Math.max(0, size - 1024)).arrayBuffer();

    const firstBytes = new Uint8Array(firstChunk);
    const lastBytes = new Uint8Array(lastChunk);

    // Simple hash: size + sum of first/last bytes
    let hash = size;
    for (const b of firstBytes) hash = ((hash << 5) - hash + b) | 0;
    for (const b of lastBytes) hash = ((hash << 5) - hash + b) | 0;

    return `fp_${size}_${Math.abs(hash).toString(36)}`;
  } catch {
    return `fp_${file.size}_${file.name}`;
  }
}
