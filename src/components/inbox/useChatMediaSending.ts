import { useState, useRef, useCallback } from 'react';
import { log } from '@/lib/logger';
import { supabase } from '@/integrations/supabase/client';
import { normalizeMediaUrl } from '@/utils/normalizeMediaUrl';
import { toast } from '@/hooks/use-toast';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';

/**
 * Encapsulates WhatsApp instance resolution and media-message sending
 * (stickers, custom emojis, audio memes) to keep ChatPanel lean.
 */
export function useChatMediaSending(contactId: string, contactPhone: string | undefined) {
  const [instanceName, setInstanceName] = useState('');
  const [whatsappConnectionId, setWhatsappConnectionId] = useState<string | null>(null);
  const resolvedRef = useRef(false);

  const { sendStickerMessage } = useEvolutionApi();

  const resolveInstance = useCallback(async (): Promise<string> => {
    if (instanceName) return instanceName;

    try {
      const { data: contact } = await supabase
        .from('contacts')
        .select('whatsapp_connection_id')
        .eq('id', contactId)
        .maybeSingle();

      if (contact?.whatsapp_connection_id) {
        setWhatsappConnectionId(contact.whatsapp_connection_id);
        const { data: conn } = await supabase
          .from('whatsapp_connections')
          .select('instance_id')
          .eq('id', contact.whatsapp_connection_id)
          .maybeSingle();
        if (conn?.instance_id) {
          setInstanceName(conn.instance_id);
          return conn.instance_id;
        }
      }

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

    try {
      const phone = contactPhone!.replace(/\D/g, '');
      const { data: dbData } = await supabase.from('messages').insert({
        contact_id: contactId,
        whatsapp_connection_id: whatsappConnectionId,
        content: '[Sticker]',
        message_type: 'sticker',
        media_url: stickerUrl,
        sender: 'agent',
        status: 'sending',
      }).select('id').single();

      const messageId = dbData?.id;
      let externalId: string | null = null;

      try {
        const result = await sendStickerMessage(inst, phone, stickerUrl);
        externalId = result?.key?.id || null;
      } catch (err: unknown) {
        if (messageId) await supabase.from('messages').update({ status: 'failed' }).eq('id', messageId);
        toast({ title: 'Erro ao enviar figurinha', description: err instanceof Error ? err.message : 'Falha na API', variant: 'destructive' });
        return;
      }

      if (!externalId) {
        if (messageId) await supabase.from('messages').update({ status: 'failed' }).eq('id', messageId);
        toast({ title: 'Erro ao enviar figurinha', description: 'Falha na API', variant: 'destructive' });
        return;
      }

      if (messageId) {
        supabase.from('messages').update({ external_id: externalId, status: 'sent' }).eq('id', messageId).then(() => {});
      }

      // Auto-save sticker
      supabase.from('stickers').select('id').eq('image_url', stickerUrl).maybeSingle().then(async ({ data: existing }) => {
        if (!existing) {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('stickers').insert({
            name: `Enviada ${new Date().toLocaleDateString('pt-BR')}`,
            image_url: stickerUrl, category: 'enviadas', is_favorite: false, use_count: 1, uploaded_by: user?.id || null,
          });
        }
      });

      toast({ title: 'Figurinha enviada!' });
    } catch {
      toast({ title: 'Erro ao enviar figurinha', variant: 'destructive' });
    }
  }, [ensureInstance, contactId, contactPhone, whatsappConnectionId, sendStickerMessage]);

  const handleSendCustomEmoji = useCallback(async (emojiUrl: string) => {
    const inst = await ensureInstance();
    if (!inst) return;

    try {
      const phone = contactPhone!.replace(/\D/g, '');
      const isUrl = emojiUrl.startsWith('http');

      const apiPromise = isUrl
        ? supabase.functions.invoke('evolution-api', { method: 'POST', body: { action: 'send-media', instanceName: inst, number: phone, mediaUrl: emojiUrl, mediaType: 'image' } })
        : supabase.functions.invoke('evolution-api', { method: 'POST', body: { action: 'send-text', instanceName: inst, number: phone, text: emojiUrl } });

      const dbPromise = supabase.from('messages').insert({
        contact_id: contactId, whatsapp_connection_id: whatsappConnectionId,
        content: isUrl ? '[Emoji]' : emojiUrl, message_type: isUrl ? 'image' : 'text',
        media_url: isUrl ? emojiUrl : null, sender: 'agent', status: 'sending',
      }).select('id').single();

      const [apiResult, dbResult] = await Promise.all([apiPromise, dbPromise]);
      const messageId = dbResult?.data?.id;
      const externalId = apiResult?.data?.key?.id || null;

      if (apiResult?.error || !externalId) {
        if (messageId) await supabase.from('messages').update({ status: 'failed' }).eq('id', messageId);
        toast({ title: 'Erro ao enviar emoji', description: 'Falha na API', variant: 'destructive' });
        return;
      }

      if (messageId) {
        supabase.from('messages').update({ external_id: externalId, status: 'sent' }).eq('id', messageId).then(() => {});
      }
      toast({ title: 'Emoji enviado!' });
    } catch {
      toast({ title: 'Erro ao enviar emoji', variant: 'destructive' });
    }
  }, [ensureInstance, contactId, contactPhone, whatsappConnectionId]);

  const handleSendAudioMeme = useCallback(async (audioUrl: string) => {
    const inst = await ensureInstance();
    if (!inst) return;

    try {
      const phone = contactPhone!.replace(/\D/g, '');
      const normalizedAudioUrl = normalizeMediaUrl(audioUrl);

      const apiPromise = supabase.functions.invoke('evolution-api', {
        body: { action: 'send-audio', instanceName: inst, number: phone, audioUrl: normalizedAudioUrl },
      });

      const dbPromise = supabase.from('messages').insert({
        contact_id: contactId, whatsapp_connection_id: whatsappConnectionId,
        content: '[Áudio Meme]', message_type: 'audio',
        media_url: normalizedAudioUrl, sender: 'agent', status: 'sending',
      }).select('id').single();

      const [apiResult, dbResult] = await Promise.all([apiPromise, dbPromise]);
      const messageId = dbResult?.data?.id;

      if (apiResult?.error || !apiResult?.data?.key?.id) {
        if (messageId) await supabase.from('messages').update({ status: 'failed' }).eq('id', messageId);
        toast({ title: 'Erro ao enviar áudio meme', description: 'Falha na API', variant: 'destructive' });
        return;
      }

      const externalId = apiResult.data.key.id;
      if (messageId) {
        supabase.from('messages').update({ external_id: externalId, status: 'sent' }).eq('id', messageId).then(() => {});
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
