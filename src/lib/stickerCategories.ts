/**
 * Synchronized sticker categories — single source of truth.
 *
 * Used by:
 * - Frontend: StickerCategoryBar, CategorySelector, StickerGrid
 * - Backend: classify-sticker Edge Function
 * - useStickerPicker: default category on upload
 *
 * Adding a new category? Add it here and it will be available everywhere.
 */

export interface CategoryConfig {
  /** Display label in pt-BR */
  label: string;
  /** Emoji shown in category bar and grid badges */
  emoji: string;
  /** AI prompt keyword (used by classify-sticker Edge Function) */
  aiKeyword: string;
}

/**
 * All sticker categories.
 * Order matters — this is the display order in the category bar.
 */
export const STICKER_CATEGORIES: Record<string, CategoryConfig> = {
  'comemoração': { label: 'Comemoração', emoji: '🎉', aiKeyword: 'comemoração' },
  'riso':        { label: 'Riso', emoji: '😂', aiKeyword: 'riso' },
  'chorando':    { label: 'Chorando', emoji: '😢', aiKeyword: 'chorando' },
  'amor':        { label: 'Amor', emoji: '❤️', aiKeyword: 'amor' },
  'raiva':       { label: 'Raiva', emoji: '😤', aiKeyword: 'raiva' },
  'surpresa':    { label: 'Surpresa', emoji: '😲', aiKeyword: 'surpresa' },
  'pensativo':   { label: 'Pensativo', emoji: '🤔', aiKeyword: 'pensativo' },
  'cumprimento': { label: 'Cumprimento', emoji: '👋', aiKeyword: 'cumprimento' },
  'despedida':   { label: 'Despedida', emoji: '👋', aiKeyword: 'despedida' },
  'concordância':{ label: 'Concordância', emoji: '👍', aiKeyword: 'concordância' },
  'negação':     { label: 'Negação', emoji: '👎', aiKeyword: 'negação' },
  'sono':        { label: 'Sono', emoji: '😴', aiKeyword: 'sono' },
  'fome':        { label: 'Fome', emoji: '🍔', aiKeyword: 'fome' },
  'medo':        { label: 'Medo', emoji: '😨', aiKeyword: 'medo' },
  'vergonha':    { label: 'Vergonha', emoji: '😳', aiKeyword: 'vergonha' },
  'deboche':     { label: 'Deboche', emoji: '😏', aiKeyword: 'deboche' },
  'fofo':        { label: 'Fofo', emoji: '🥰', aiKeyword: 'fofo' },
  'triste':      { label: 'Triste', emoji: '😔', aiKeyword: 'triste' },
  'animado':     { label: 'Animado', emoji: '🤩', aiKeyword: 'animado' },
  'engraçado':   { label: 'Engraçado', emoji: '🤣', aiKeyword: 'engraçado' },
  'enviadas':    { label: 'Enviadas', emoji: '📤', aiKeyword: 'enviadas' },
  'outros':      { label: 'Outros', emoji: '📦', aiKeyword: 'outros' },
} as const;

/** Category keys as an array (for AI prompt and validation) */
export const CATEGORY_KEYS = Object.keys(STICKER_CATEGORIES);

/** Validates if a string is a valid category key */
export function isValidCategory(key: string): boolean {
  return key in STICKER_CATEGORIES;
}

/** Get category config with fallback to 'outros' */
export function getCategoryConfig(key: string): CategoryConfig {
  return STICKER_CATEGORIES[key] || STICKER_CATEGORIES['outros'];
}

/** Generate the AI classification prompt categories string */
export function getAICategoryPrompt(): string {
  return CATEGORY_KEYS.filter(k => k !== 'enviadas').join(', ');
}
