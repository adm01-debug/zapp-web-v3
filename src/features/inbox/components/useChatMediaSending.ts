import { useState, useRef, useCallback } from 'react';
import { log } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { normalizeMediaUrl } from '@/utils/normalizeMediaUrl';
import { toast } from '@/hooks/use-toast';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { newRequestId } from '@/lib/withRequestId';

/**
 * Encapsulates WhatsApp instance resolution and media-message sending
 * (stickers, custom emojis, audio memes) to keep ChatPanel lean.
 *
 * FIXES APPLIED:
 * - BUG 1: contactPhone! non-null assertion → safe guard
 * - FALHA 5: fire-and-forget status update → proper error handling
 * - FALHA 6: fire-and-forget auto-save → error logging
 * - FALHA 9: 'contacts' table → 'evolution_contacts' (matches real schema)
 */
export function useChatMediaSending(contactId: string, contactPhone: string | undefined) {
  const [instanceName, setInstanceName] = useState('');
  const [whatsappConnectionId, setWhatsappConnectionId] = useState<string | null>(null);
  const resolvedRef = useRef(false);

  const { sendStickerMessage } = useEvolutionApi();

  const resolveInstance = useCallback(async (): Promise<string> => {
    if (instanceName) return instanceName;

    try {
      // FIX FALHA 9: Use 'evolution_contacts' instead of 'contacts'
      const { data: contact } = await supabase
        .from('evolution_contacts')
        .select('instance_name')
        .eq('id', contactId)
        .maybeSingle();

      if (contact?.instance_name) {
        setInstanceName(contact.instance_name);
        return contact.instance_name;
      }

      // Fallback: try whatsapp_connections table
      const { data: fallbackConn } = await supabase
        .from('whatsapp_connections')
        .select('instance_id')
        .eq('status', 'connected')
        .limit(1)
        .maybeSingle();

      if (fallbackConn?.instance_id) {
        setInstanceName(fallbackConn.instance_id);
        return fallbackConn.instance_id;
      }
    } catch (err) {
      log.error('Failed to resolve WhatsApp instance:', err);
    }
    return '';
  }, [contactId, instanceName]);

  const initResolve = useCallback(async () => {
    if (!resolvedRef.current) {
      resolvedRef.current = true;
      await resolveInstance();
    }
  }, [resolveInstance]);

  const ensureInstance = useCallback(async (): Promise<string | null> => {
    const resolved = instanceName || await resolveInstance();
    if (!resolved || !contactPhone) {
      toast({ title: 'Erro', description: 'Conexão WhatsApp não disponível.' });
      return null;
    }
    return resolved;
  }, [instanceName, resolveInstance, contactPhone]);

  const handleSendSticker = useCallback(async (stickerUrl: string) => {
    const inst = await ensureInstance();
    if (!inst) return;

    // FIX BUG 1: Safe phone extraction (no more non-null assertion crash)
    if (!contactPhone) {
      toast({ title: 'Erro', description: 'Telefone do contato não disponível.', variant: 'destructive' });
      return;
    }
    const phone = contactPhone.replace(/\D/g, '');
    if (!phone || phone.length < 10) {
      toast({ title: 'Erro', description: 'Número de telefone inválido.', variant: 'destructive' });
      return;
    }

    try {
      const { data: dbData, error: dbError } = await supabase.from('messages').insert({
        contact_id: contactId,
        whatsapp_connection_id: whatsappConnectionId,
        content: '[Sticker]',
        message_type: 'sticker',
        media_url: stickerUrl,
        sender: 'agent',
        status: 'sending',
      }).select('id').single();

      if (dbError) {
        log.error('[Sticker] DB insert failed:', dbError);
      }

      const messageId = dbData?.id;
      let externalId: string | null = null;

      try {
        const result = await sendStickerMessage(inst, phone, stickerUrl);
        externalId = result?.key?.id || null;
      } catch (err: unknown) {
        if (messageId) {
          await supabase.from('messages').update({ status: 'failed' }).eq('id', messageId);
        }
        toast({
          title: 'Erro ao enviar figurinha',
          description: err instanceof Error ? err.message : 'Falha na API',
          variant: 'destructive',
        });
        return;
      }

      if (!externalId) {
        if (messageId) {
          await supabase.from('messages').update({ status: 'failed' }).eq('id', messageId);
        }
        toast({ title: 'Erro ao enviar figurinha', description: 'Falha na API', variant: 'destructive' });
        return;
      }

      // FIX FALHA 5: Proper error handling instead of fire-and-forget .then(() => {})
      if (messageId) {
        const { error: updateError } = await supabase
          .from('messages')
          .update({ external_id: externalId, status: 'sent' })
          .eq('id', messageId);

        if (updateError) {
          log.error('[Sticker] Failed to update message status to sent:', updateError);
        }
      }

      // FIX FALHA 6: Auto-save with error handling instead of fire-and-forget
      try {
        const { data: existing } = await supabase
          .from('stickers')
          .select('id')
          .eq('image_url', stickerUrl)
          .maybeSingle();

        if (!existing) {
          const { data: { user } } = await supabase.auth.getUser();
          const { error: saveError } = await supabase.from('stickers').insert({
            name: `Enviada ${new Date().toLocaleDateString('pt-BR')}`,
            image_url: stickerUrl,
            category: 'enviadas',
            is_favorite: false,
            use_count: 1,
            uploaded_by: user?.id || null,
          });

          if (saveError) {
            log.error('[Sticker] Auto-save sticker failed:', saveError);
          }
        }
      } catch (autoSaveErr) {
        log.error('[Sticker] Auto-save unexpected error:', autoSaveErr);
      }

      toast({ title: 'Figurinha enviada!' });
    } catch {
      toast({ title: 'Erro ao enviar figurinha', variant: 'destructive' });
    }
  }, [ensureInstance, contactId, contactPhone, whatsappConnectionId, sendStickerMessage]);

  const handleSendCustomEmoji = useCallback(async (emojiUrl: string) => {
    const inst = await ensureInstance();
    if (!inst) return;

    // FIX BUG 1: Safe phone check
    if (!contactPhone) {
      toast({ title: 'Erro', description: 'Telefone do contato não disponível.', variant: 'destructive' });
      return;
    }
    const phone = contactPhone.replace(/\D/g, '');

    try {
      const isUrl = emojiUrl.startsWith('http');
      const trace = newRequestId('emoji');

      const apiPromise = isUrl
        ? supabase.functions.invoke('evolution-api', { method: 'POST', body: { action: 'send-media', instanceName: inst, number: phone, mediaUrl: emojiUrl, mediaType: 'image' }, headers: trace.headers })
        : supabase.functions.invoke('evolution-api', { method: 'POST', body: { action: 'send-text', instanceName: inst, number: phone, text: emojiUrl }, headers: trace.headers });

      const dbPromise = supabase.from('messages').insert({
        contact_id: contactId, whatsapp_connection_id: whatsappConnectionId,
        content: isUrl ? '[Emoji]' : emojiUrl, message_type: isUrl ? 'image' : 'text',
        media_url: isUrl ? emojiUrl : null, sender: 'agent', status: 'sending',
        request_id: trace.requestId,
      }).select('id').single();

      const [apiResult, dbResult] = await Promise.all([apiPromise, dbPromise]);
      const messageId = dbResult?.data?.id;
      const externalId = apiResult?.data?.key?.id || null;

      if (apiResult?.error || !externalId) {
        if (messageId) await supabase.from('messages').update({ status: 'failed' }).eq('id', messageId);
        toast({ title: 'Erro ao enviar emoji', description: 'Falha na API', variant: 'destructive' });
        return;
      }

      // FIX: proper await instead of fire-and-forget
      if (messageId) {
        const { error: updateErr } = await supabase.from('messages').update({ external_id: externalId, status: 'sent' }).eq('id', messageId);
        if (updateErr) log.error('[Emoji] Status update failed:', updateErr);
      }
      toast({ title: 'Emoji enviado!' });
    } catch {
      toast({ title: 'Erro ao enviar emoji', variant: 'destructive' });
    }
  }, [ensureInstance, contactId, contactPhone, whatsappConnectionId]);

  const handleSendAudioMeme = useCallback(async (audioUrl: string) => {
    const inst = await ensureInstance();
    if (!inst) return;

    // FIX BUG 1: Safe phone check
    if (!contactPhone) {
      toast({ title: 'Erro', description: 'Telefone do contato não disponível.', variant: 'destructive' });
      return;
    }
    const phone = contactPhone.replace(/\D/g, '');

    try {
      const normalizedAudioUrl = normalizeMediaUrl(audioUrl);
      const trace = newRequestId('audio');

      const apiPromise = supabase.functions.invoke('evolution-api', {
        body: { action: 'send-audio', instanceName: inst, number: phone, audioUrl: normalizedAudioUrl },
        headers: trace.headers,
      });

      const dbPromise = supabase.from('messages').insert({
        contact_id: contactId, whatsapp_connection_id: whatsappConnectionId,
        content: '[Áudio Meme]', message_type: 'audio',
        media_url: normalizedAudioUrl, sender: 'agent', status: 'sending',
        request_id: trace.requestId,
      }).select('id').single();

      const [apiResult, dbResult] = await Promise.all([apiPromise, dbPromise]);
      const messageId = dbResult?.data?.id;

      if (apiResult?.error || !apiResult?.data?.key?.id) {
        if (messageId) await supabase.from('messages').update({ status: 'failed' }).eq('id', messageId);
        toast({ title: 'Erro ao enviar áudio meme', description: 'Falha na API', variant: 'destructive' });
        return;
      }

      const externalId = apiResult.data.key.id;
      // FIX: proper await instead of fire-and-forget
      if (messageId) {
        const { error: updateErr } = await supabase.from('messages').update({ external_id: externalId, status: 'sent' }).eq('id', messageId);
        if (updateErr) log.error('[AudioMeme] Status update failed:', updateErr);
      }
      toast({ title: '🔊 Áudio meme enviado!' });
    } catch {
      toast({ title: 'Erro ao enviar áudio meme', variant: 'destructive' });
    }
  }, [ensureInstance, contactId, contactPhone, whatsappConnectionId]);

  return {
    instanceName,
    whatsappConnectionId,
    initResolve,
    resolveInstance,
    handleSendSticker,
    handleSendCustomEmoji,
    handleSendAudioMeme,
  };
}
