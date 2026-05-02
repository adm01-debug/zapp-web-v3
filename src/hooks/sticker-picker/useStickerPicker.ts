import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getLogger } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast'; // FIX: was 'sonner' — unified toast library
import { type StickerItem, type PendingUpload, CATEGORY_LABELS } from '@/features/inbox';

const log = getLogger('StickerPicker');
const RECENT_LIMIT = 8;
const MAX_STICKER_SIZE = 500 * 1024; // 500KB
const ACCEPTED_TYPES = ['image/webp', 'image/png', 'image/gif', 'image/jpeg'];

/**
 * Safely extracts the storage path from a Supabase Storage URL.
 * Handles query params, encoding, and nested paths.
 */
function extractStoragePath(url: string, bucket: string): string | null {
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
  } catch {
    // Fallback: simple split (legacy URLs)
    const parts = url.split(`/${bucket}/`);
    if (parts.length < 2) return null;
    return parts[1].split('?')[0]; // Strip query params
  }
}

/**
 * Validates that a DB record has the required StickerItem fields.
 */
function isStickerItem(item: unknown): item is StickerItem {
  if (!item || typeof item !== 'object') return false;
  const obj = item as Record<string, unknown>;
  return typeof obj.id === 'string' && typeof obj.image_url === 'string';
}

export function useStickerPicker(onSendSticker: (url: string) => void) {
  const [open, setOpen] = useState(false);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null);
  const [gridSize, setGridSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // FIX BUG 3: Runtime validation instead of unsafe `as StickerItem[]` cast
  const fetchStickers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('stickers')
        .select('*')
        .order('use_count', { ascending: false })
        .limit(1000);

      if (error) {
        log.error('[StickerPicker] Fetch error:', error);
        toast({ title: 'Erro ao carregar figurinhas', variant: 'destructive' });
      } else if (data) {
        // Runtime validation: filter out malformed records
        const validated = data.filter(isStickerItem);
        if (validated.length !== data.length) {
          log.warn(`[StickerPicker] ${data.length - validated.length} invalid sticker records filtered out`);
        }
        setStickers(validated);
      }
    } catch (err) {
      log.error('[StickerPicker] Unexpected fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) { fetchStickers(); setTimeout(() => searchInputRef.current?.focus(), 100); }
  }, [open, fetchStickers]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast({ title: 'Arquivo não é uma imagem válida', description: 'Aceitos: WebP, PNG, GIF, JPEG', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_STICKER_SIZE) {
      toast({ title: 'Arquivo excede 500KB', description: `Tamanho: ${Math.round(file.size / 1024)}KB`, variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'webp';
      const storagePath = `sticker_${Date.now()}_${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('stickers')
        .upload(storagePath, file, { contentType: file.type, cacheControl: '31536000' });

      if (uploadError) {
        log.error('[StickerPicker] Upload error:', uploadError);
        toast({ title: 'Erro ao enviar arquivo', description: uploadError.message, variant: 'destructive' });
        return;
      }

      const { data: urlData } = supabase.storage.from('stickers').getPublicUrl(storagePath);
      let aiCategory = 'enviadas';

      try {
        toast({ title: '🔍 Classificando figurinha com IA...' });
        const { data: classifyData, error: classifyErr } = await supabase.functions.invoke('classify-sticker', {
          body: { image_url: urlData.publicUrl },
        });
        if (!classifyErr && classifyData?.category) aiCategory = classifyData.category;
      } catch (err) {
        log.error('[StickerPicker] Classification error:', err);
      }

      setPendingUpload({
        file,
        imageUrl: urlData.publicUrl,
        storagePath,
        aiCategory,
        selectedCategory: aiCategory,
        name: file.name.replace(/\.[^.]+$/, ''),
      });
    } catch (err) {
      log.error('[StickerPicker] Process file error:', err);
      toast({ title: 'Erro ao processar figurinha', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
  }, []);

  // FIX BUG 2: Added processFile to dependency array (no longer stale closure)
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleConfirmUpload = async (pending: PendingUpload) => {
    const { data: { user } } = await supabase.auth.getUser();

    // Check for duplicate before inserting
    const { data: existing } = await supabase
      .from('stickers')
      .select('id')
      .eq('image_url', pending.imageUrl)
      .maybeSingle();

    if (existing) {
      toast({ title: 'Figurinha já existe', description: 'Esta imagem já está na sua biblioteca.' });
      setPendingUpload(null);
      return;
    }

    const { error: insertError } = await supabase.from('stickers').insert({
      name: pending.name,
      image_url: pending.imageUrl,
      category: pending.selectedCategory,
      is_favorite: false,
      use_count: 0,
      uploaded_by: user?.id || null,
    });

    if (insertError) {
      log.error('[StickerPicker] Insert error:', insertError);
      toast({ title: 'Erro ao salvar figurinha', variant: 'destructive' });
      return;
    }

    toast({ title: `✅ Figurinha "${pending.name}" salva como "${CATEGORY_LABELS[pending.selectedCategory]?.label}"!` });
    setPendingUpload(null);
    fetchStickers();
  };

  const handleCancelUpload = async () => {
    if (pendingUpload) {
      await supabase.storage.from('stickers').remove([pendingUpload.storagePath]);
    }
    setPendingUpload(null);
  };

  // FIX FALHA 7: Added error handling for use_count update
  const handleSend = async (sticker: StickerItem) => {
    onSendSticker(sticker.image_url);
    setOpen(false);

    const { error } = await supabase
      .from('stickers')
      .update({ use_count: (sticker.use_count || 0) + 1 })
      .eq('id', sticker.id);

    if (error) {
      log.error('[StickerPicker] use_count update failed:', error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent, sticker: StickerItem) => {
    e.stopPropagation();
    const newVal = !sticker.is_favorite;
    setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, is_favorite: newVal } : s));

    const { error } = await supabase.from('stickers').update({ is_favorite: newVal }).eq('id', sticker.id);
    if (error) {
      log.error('[StickerPicker] Favorite toggle failed:', error);
      // Revert optimistic update on failure
      setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, is_favorite: !newVal } : s));
      toast({ title: 'Erro ao atualizar favorito', variant: 'destructive' });
    } else {
      toast({ title: newVal ? '⭐ Adicionada aos favoritos' : 'Removida dos favoritos' });
    }
  };

  const handleCategoryChange = async (sticker: StickerItem, newCategory: string) => {
    const oldCategory = sticker.category;
    setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, category: newCategory } : s));

    const { error } = await supabase.from('stickers').update({ category: newCategory }).eq('id', sticker.id);
    if (error) {
      log.error('[StickerPicker] Category update failed:', error);
      setStickers(prev => prev.map(s => s.id === sticker.id ? { ...s, category: oldCategory } : s));
      toast({ title: 'Erro ao atualizar categoria', variant: 'destructive' });
    } else {
      toast({ title: `Categoria: "${CATEGORY_LABELS[newCategory]?.label || newCategory}"` });
    }
  };

  // FIX FALHA 8: Safe URL parsing using URL API instead of fragile split()
  const handleDelete = async (e: React.MouseEvent, sticker: StickerItem) => {
    e.stopPropagation();
    setStickers(prev => prev.filter(s => s.id !== sticker.id));

    // Determine bucket and extract path safely
    const isWhatsappMedia = sticker.image_url.includes('/whatsapp-media/');
    const bucket = isWhatsappMedia ? 'whatsapp-media' : 'stickers';
    const storagePath = extractStoragePath(sticker.image_url, bucket);

    if (storagePath) {
      const { error: storageError } = await supabase.storage.from(bucket).remove([storagePath]);
      if (storageError) {
        log.error(`[StickerPicker] Storage delete error (${bucket}):`, storageError);
      }
    }

    const { error: dbError } = await supabase.from('stickers').delete().eq('id', sticker.id);
    if (dbError) {
      log.error('[StickerPicker] DB delete error:', dbError);
      toast({ title: 'Erro ao excluir figurinha', variant: 'destructive' });
    } else {
      toast({ title: 'Figurinha removida' });
    }
  };

  const filtered = useMemo(() => {
    let result = stickers;
    if (search) {
      const term = search.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(term) ||
        s.category?.toLowerCase().includes(term) ||
        CATEGORY_LABELS[s.category]?.label?.toLowerCase().includes(term)
      );
    }
    if (showRecent) result = [...result].sort((a, b) => (b.use_count || 0) - (a.use_count || 0)).slice(0, RECENT_LIMIT);
    else if (showFavorites) result = result.filter(s => s.is_favorite);
    else if (activeCategory) result = result.filter(s => s.category === activeCategory);
    return result;
  }, [stickers, search, showFavorites, showRecent, activeCategory]);

  const cycleGridSize = () => setGridSize(prev => prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'sm');

  return {
    open, setOpen, stickers, filtered, loading, search, setSearch, uploading, activeCategory, setActiveCategory,
    showFavorites, setShowFavorites, showRecent, setShowRecent, pendingUpload, setPendingUpload,
    gridSize, isDragOver, fileInputRef, searchInputRef,
    handleDragOver, handleDragLeave, handleDrop, handleFileSelect,
    handleConfirmUpload, handleCancelUpload, handleSend, toggleFavorite, handleCategoryChange, handleDelete, cycleGridSize,
  };
}
