import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';
import { toast } from 'sonner';

export interface MediaUploadItem {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'sending_api' | 'completed' | 'failed';
  progress: number;
  errorMessage?: string;
}

export function useMediaUploadQueue(contactId: string) {
  const [queue, setQueue] = useState<MediaUploadItem[]>([]);
  const agentIdRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      agentIdRef.current = data.user?.id || null;
    });
  }, []);

  const addToQueue = useCallback(async (file: File, caption?: string) => {
    if (!agentIdRef.current) return null;

    const newItem: MediaUploadItem = {
      id: crypto.randomUUID(),
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      status: 'pending',
      progress: 0,
    };

    setQueue(prev => [...prev, newItem]);

    try {
      // 1. Registrar na tabela Lovable Cloud
      const { data: dbEntry, error: dbError } = await supabase
        .from('media_upload_queue')
        .insert({
          id: newItem.id,
          contact_id: contactId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          agent_id: agentIdRef.current,
          caption,
          status: 'uploading'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 2. Upload para Storage (exemplo simples, integraria com bucket real)
      const storagePath = `${contactId}/${newItem.id}_${file.name}`;
      
      setQueue(prev => prev.map(item => 
        item.id === newItem.id ? { ...item, status: 'uploading' } : item
      ));

      const { error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Sincroniza progresso 100%
      void supabase.from('media_upload_queue').update({ progress: 100 }).eq('id', newItem.id);

      // 3. Atualiza status para 'uploaded'
      await supabase.from('media_upload_queue').update({ 
        status: 'uploaded',
        storage_path: storagePath
      }).eq('id', newItem.id);

      setQueue(prev => prev.map(item => 
        item.id === newItem.id ? { ...item, status: 'uploaded', progress: 100 } : item
      ));

      return newItem.id;
    } catch (err: any) {
      log.error('[MediaQueue] Upload failed:', err);
      const errorMsg = err.message || 'Erro no upload';
      
      setQueue(prev => prev.map(item => 
        item.id === newItem.id ? { ...item, status: 'failed', errorMessage: errorMsg } : item
      ));

      await supabase.from('media_upload_queue').update({ 
        status: 'failed',
        error_message: errorMsg
      }).eq('id', newItem.id);

      toast.error(`Falha no anexo: ${file.name}`);
      return null;
    }
  }, [contactId]);

  const retryUpload = useCallback(async (id: string, file: File) => {
    setQueue(prev => prev.filter(item => item.id !== id));
    return addToQueue(file);
  }, [addToQueue]);

  return { queue, addToQueue, retryUpload };
}
