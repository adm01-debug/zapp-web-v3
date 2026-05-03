/**
 * Orchestration hook that integrates ALL sticker subsystems:
 * - Validation (stickerValidator)
 * - WebP conversion (stickerConverter)
 * - Background AI classification (useBackgroundClassifier)
 * - Pagination (useStickerPagination)
 *
 * This replaces the raw processFile in useStickerPicker with a
 * production-grade pipeline:
 *
 * File → Validate → Convert to WebP → Upload → Classify (background) → Save
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';
import { toast } from '@/hooks/use-toast';
import { validateStickerFile } from '@/lib/stickerValidator';
import { convertToWebP } from '@/lib/stickerConverter';
import { generateStickerFingerprint } from '@/lib/stickerValidator';
import { useBackgroundClassifier } from '@/hooks/useBackgroundClassifier';

const log = getLogger('StickerPipeline');

export interface PipelineResult {
  success: boolean;
  stickerId?: string;
  imageUrl?: string;
  category?: string;
  error?: string;
}

/**
 * Full sticker processing pipeline.
 * Validates → Converts → Deduplicates → Uploads → Classifies
 */
export function useStickerPipeline() {
  const { classifyInBackground } = useBackgroundClassifier();

  const processAndUpload = useCallback(async (
    file: File,
    options?: {
      name?: string;
      category?: string;
      skipClassification?: boolean;
    }
  ): Promise<PipelineResult> => {
    const name = options?.name || file.name.replace(/\.[^.]+$/, '');

    // Step 1: Validate
    const validation = await validateStickerFile(file);
    if (!validation.valid) {
      const errorMsg = validation.errors.join(' ');
      toast({ title: 'Figurinha inv\u00e1lida', description: errorMsg, variant: 'destructive' });
      return { success: false, error: errorMsg };
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      log.warn('[StickerPipeline] Warnings:', validation.warnings);
    }

    // Step 2: Convert to WebP (if needed)
    let uploadFile: File | Blob = file;
    let uploadContentType = file.type;
    let uploadExt = file.name.split('.').pop() || 'webp';

    try {
      if (file.type !== 'image/webp') {
        toast({ title: '\ud83d\udd04 Convertendo para WebP...' });
        const conversion = await convertToWebP(file);
        if (conversion.wasConverted) {
          uploadFile = conversion.blob;
          uploadContentType = 'image/webp';
          uploadExt = 'webp';
          log.info(`[StickerPipeline] Converted ${file.type} \u2192 WebP (${conversion.sizeKB}KB)`);
        }
      }
    } catch (convErr) {
      log.error('[StickerPipeline] Conversion failed, using original:', convErr);
      // Continue with original file if conversion fails
    }

    // Step 3: Check for duplicates
    try {
      const fingerprint = await generateStickerFingerprint(file);
      const { data: existing } = await supabase
        .from('stickers')
        .select('id, name')
        .eq('name', fingerprint)
        .maybeSingle();

      if (existing) {
        toast({ title: 'Figurinha duplicada', description: `"${existing.name}" j\u00e1 existe.` });
        return { success: false, error: 'Duplicate sticker', stickerId: existing.id };
      }
    } catch {
      // Duplicate check is best-effort, continue on failure
    }

    // Step 4: Upload to Supabase Storage
    const storagePath = `sticker_${Date.now()}_${crypto.randomUUID()}.${uploadExt}`;
    const { error: uploadError } = await supabase.storage
      .from('stickers')
      .upload(storagePath, uploadFile, {
        contentType: uploadContentType,
        cacheControl: '31536000',
      });

    if (uploadError) {
      log.error('[StickerPipeline] Upload failed:', uploadError);
      toast({ title: 'Erro no upload', description: uploadError.message, variant: 'destructive' });
      return { success: false, error: uploadError.message };
    }

    const { data: urlData } = supabase.storage.from('stickers').getPublicUrl(storagePath);
    const imageUrl = urlData.publicUrl;

    // Step 5: Save to database
    const { data: { user } } = await supabase.auth.getUser();
    const defaultCategory = options?.category || 'outros';

    const { data: sticker, error: insertError } = await supabase
      .from('stickers')
      .insert({
        name,
        image_url: imageUrl,
        category: defaultCategory,
        is_favorite: false,
        use_count: 0,
        uploaded_by: user?.id || null,
      })
      .select('id')
      .single();

    if (insertError) {
      log.error('[StickerPipeline] DB insert failed:', insertError);
      // Cleanup: remove uploaded file
      await supabase.storage.from('stickers').remove([storagePath]);
      toast({ title: 'Erro ao salvar', description: insertError.message, variant: 'destructive' });
      return { success: false, error: insertError.message };
    }

    // Step 6: Background AI classification (non-blocking)
    if (!options?.skipClassification && sticker?.id) {
      classifyInBackground(sticker.id, imageUrl, (resolvedCategory) => {
        log.info(`[StickerPipeline] AI classified as "${resolvedCategory}"`);
      });
    }

    toast({ title: `\u2705 Figurinha "${name}" salva!` });

    return {
      success: true,
      stickerId: sticker?.id,
      imageUrl,
      category: defaultCategory,
    };
  }, [classifyInBackground]);

  return { processAndUpload };
}
