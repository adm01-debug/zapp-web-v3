/**
 * Hook for non-blocking AI sticker classification.
 *
 * GAP 16 fix: Instead of blocking the upload flow for up to 15s waiting
 * for Gemini classification, this hook:
 * 1. Immediately assigns an optimistic category ('outros')
 * 2. Runs classification in the background
 * 3. Updates the sticker's category once AI responds
 * 4. If AI fails or times out, the sticker keeps its default category
 *
 * This makes uploads feel instant while still getting AI classification.
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';

const log = getLogger('StickerClassifier');

/** Classification timeout (5s instead of the Edge Function's 15s) */
const CLASSIFY_TIMEOUT_MS = 8000;

export function useBackgroundClassifier() {
  /**
   * Classify a sticker in the background and update the DB.
   * Returns immediately — does NOT block the caller.
   *
   * @param stickerId - The sticker's DB id to update
   * @param imageUrl - The public URL of the sticker image
   * @param onCategoryResolved - Optional callback when category is determined
   */
  const classifyInBackground = useCallback(
    (stickerId: string, imageUrl: string, onCategoryResolved?: (category: string) => void) => {
      // Fire-and-forget — intentionally not awaited
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), CLASSIFY_TIMEOUT_MS);

      (async () => {
        try {
          const { data, error } = await supabase.functions.invoke('classify-sticker', {
            body: { image_url: imageUrl },
          });

          clearTimeout(timeout);

          if (error || !data?.category) {
            log.warn('[StickerClassifier] Classification failed or empty:', error);
            return;
          }

          const category = data.category;

          // Update the sticker record in DB
          const { error: updateError } = await supabase
            .from('stickers')
            .update({ category })
            .eq('id', stickerId);

          if (updateError) {
            log.error('[StickerClassifier] DB update failed:', updateError);
            return;
          }

          log.info(`[StickerClassifier] Classified sticker ${stickerId} as "${category}"`);
          onCategoryResolved?.(category);
        } catch (err) {
          clearTimeout(timeout);
          if (err instanceof DOMException && err.name === 'AbortError') {
            log.warn('[StickerClassifier] Classification timed out');
          } else {
            log.error('[StickerClassifier] Unexpected error:', err);
          }
        }
      })();
    },
    []
  );

  return { classifyInBackground };
}
