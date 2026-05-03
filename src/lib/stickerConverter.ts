/**
 * Client-side WebP conversion for WhatsApp sticker compatibility.
 *
 * GAP 10 final fix: WhatsApp requires stickers in WebP format.
 * This utility converts PNG/JPEG/GIF images to WebP using the
 * Canvas API (zero external dependencies).
 *
 * Also handles resizing to WhatsApp's recommended 512x512px.
 */

import { getLogger } from '@/lib/logger';

const log = getLogger('StickerConverter');

const TARGET_SIZE = 512;
const WEBP_QUALITY = 0.85;
const MAX_STATIC_SIZE_KB = 100;

export interface ConversionResult {
  blob: Blob;
  width: number;
  height: number;
  originalFormat: string;
  wasConverted: boolean;
  wasResized: boolean;
  sizeKB: number;
}

/**
 * Converts an image file to WebP format and resizes to 512x512.
 * If the file is already WebP and within size limits, returns it as-is.
 *
 * @param file - The input image file
 * @returns ConversionResult with the processed blob
 */
export async function convertToWebP(file: File): Promise<ConversionResult> {
  const originalFormat = file.type;

  // If already WebP and small enough, skip conversion
  if (originalFormat === 'image/webp' && file.size <= MAX_STATIC_SIZE_KB * 1024) {
    return {
      blob: file,
      width: 0,
      height: 0,
      originalFormat,
      wasConverted: false,
      wasResized: false,
      sizeKB: Math.round(file.size / 1024),
    };
  }

  // Load image into an HTMLImageElement
  const img = await loadImage(file);
  const { naturalWidth: origW, naturalHeight: origH } = img;

  // Calculate target dimensions (fit into 512x512 maintaining aspect ratio)
  let targetW = origW;
  let targetH = origH;
  let wasResized = false;

  if (origW > TARGET_SIZE || origH > TARGET_SIZE) {
    const scale = Math.min(TARGET_SIZE / origW, TARGET_SIZE / origH);
    targetW = Math.round(origW * scale);
    targetH = Math.round(origH * scale);
    wasResized = true;
  }

  // Draw on canvas
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // Use high-quality interpolation
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Convert to WebP with quality adjustment
  let quality = WEBP_QUALITY;
  let blob = await canvasToBlob(canvas, 'image/webp', quality);

  // If still too large, reduce quality iteratively
  let attempts = 0;
  while (blob.size > MAX_STATIC_SIZE_KB * 1024 && quality > 0.3 && attempts < 5) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, 'image/webp', quality);
    attempts++;
  }

  // If still too large after quality reduction, reduce dimensions
  if (blob.size > MAX_STATIC_SIZE_KB * 1024) {
    const reducedScale = 0.75;
    canvas.width = Math.round(targetW * reducedScale);
    canvas.height = Math.round(targetH * reducedScale);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, 'image/webp', 0.7);
    targetW = canvas.width;
    targetH = canvas.height;
    wasResized = true;
  }

  log.info(`[StickerConverter] ${originalFormat} → WebP: ${Math.round(file.size/1024)}KB → ${Math.round(blob.size/1024)}KB, ${origW}x${origH} → ${targetW}x${targetH}`);

  // Cleanup
  URL.revokeObjectURL(img.src);

  return {
    blob,
    width: targetW,
    height: targetH,
    originalFormat,
    wasConverted: originalFormat !== 'image/webp',
    wasResized,
    sizeKB: Math.round(blob.size / 1024),
  };
}

/** Load a File into an HTMLImageElement */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

/** Canvas toBlob promisified */
function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      type,
      quality
    );
  });
}
