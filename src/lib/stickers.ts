/**
 * Sticker System — Barrel Export
 *
 * Single import point for all sticker-related utilities.
 * Usage: import { validateStickerFile, convertToWebP, ... } from '@/lib/stickers';
 */

// Validation
export { validateStickerFile, generateStickerFingerprint, STICKER_LIMITS } from './stickerValidator';
export type { StickerValidationResult } from './stickerValidator';

// Conversion
export { convertToWebP } from './stickerConverter';
export type { ConversionResult } from './stickerConverter';

// Categories
export {
  STICKER_CATEGORIES,
  CATEGORY_KEYS,
  isValidCategory,
  getCategoryConfig,
  getAICategoryPrompt,
} from './stickerCategories';
export type { CategoryConfig } from './stickerCategories';
