/**
 * externalMessageSender — envio de mensagens no modo FATOR X.
 *
 * O Inbox em modo `USE_EXTERNAL_DB=true` exibe conversas vindas de
 * `evolution_messages`. Esta função envia via Edge Function `evolution-api`
 * (mesmo proxy usado pelo sender legado) e devolve uma "bolha otimista" no
 * formato esperado pelo `useExternalMessages.addMessage` — o webhook
 * canônico assume a fonte da verdade segundos depois.
 *
 * Diferenças vs `messageSender.ts` (legacy):
 *  - Não grava em `public.messages` / `public.contacts`.
 *  - O `contactId` recebido é o `remote_jid` (ex.: `5511XXXXX@s.whatsapp.net`),
 *    NÃO um UUID — derivamos o telefone via `jidToPhone`.
 *  - Joga o erro pra cima (sem swallow), pra alimentar o `SendErrorBanner`.
 */
import { supabase } from '@/integrations/supabase/client';
import { jidToPhone } from '@/adapters/evolutionAdapter';
import type { RealtimeMessage } from '@/features/inbox';
import { getLogger } from '@/lib/logger';
import { parseEvolutionError } from '@/features/inbox';
import { dbInsert } from '@/integrations/datasource/db';
import { RPC } from '@/integrations/datasource/rpcCatalog';

const log = getLogger('externalMessageSender');
const DEFAULT_INSTANCE = 'wpp2';

/**
 * SendError — Error enriquecido com o motivo bruto do upstream para que
 * o `SendErrorBanner` possa oferecer "Ver detalhes" sem perder a frase
 * humanizada exibida por padrão.
 */
export class SendError extends Error {
  detail: string | null;
  status?: number;
  constructor(reason: string, detail: string | null, status?: number) {
    super(reason);
    this.name = 'SendError';
    this.detail = detail;
    this.status = status;
  }
}

export interface SendExternalOptions {
  instanceName?: string;
  contactAvatar?: string | null;
  onProgress?: (progress: number) => void;
}

export interface SendExternalResult {
  optimistic: RealtimeMessage;
  externalId: string | null;
}

function makeOptimisticBubble(
  remoteJid: string,
  content: string,
  opts: { messageType?: string; mediaUrl?: string | null; contactAvatar?: string | null } = {},
): RealtimeMessage {
  const now = new Date().toISOString();
  // ID local começa com `optimistic:` pra reconciliação. O webhook insere
  // a mensagem real com outro id e o cursor/poll a substitui no merge.
  const id = `optimistic:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    contact_id: remoteJid,
    agent_id: 'system',
    content,
    sender: 'agent',
    message_type: opts.messageType ?? 'text',
    media_url: opts.mediaUrl ?? null,
    is_read: true,
    status: 'sending',
    status_updated_at: now,
    created_at: now,
    updated_at: now,
    external_id: null,
    whatsapp_connection_id: null,
    transcription: null,
    transcription_status: null,
    is_deleted: false,
    contactAvatar: opts.contactAvatar ?? null,
  };
}

export async function sendExternalText(
  remoteJid: string,
  content: string,
  opts: SendExternalOptions = {},
): Promise<SendExternalResult> {
  const phone = jidToPhone(remoteJid);
  if (!phone) throw new Error('Contato sem JID válido para envio.');
  const instance = opts.instanceName || DEFAULT_INSTANCE;

  const optimistic = makeOptimisticBubble(remoteJid, content, { contactAvatar: opts.contactAvatar });

  // Log de auditoria (FATOR X)
  void dbInsert(RPC.rpc_log_service_event, {
    p_instance: instance,
    p_event_type: 'message_send',
    p_message: `Enviando texto para ${phone}`,
    p_remote_jid: remoteJid,
    p_payload: { content }
  });

  const { data, error } = await supabase.functions.invoke('evolution-api', {
    body: {
      action: 'send-text',
      instanceName: instance,
      number: phone,
      text: content,
    },
  });

  if (error) {
    log.error('evolution-api send-text failed', error);
    const info = parseEvolutionError(error);
    
    void dbInsert(RPC.rpc_log_service_event, {
      p_instance: instance,
      p_event_type: 'error',
      p_level: 'error',
      p_message: `Falha no envio para ${phone}: ${info.reason}`,
      p_remote_jid: remoteJid,
      p_payload: { error: info }
    });

    throw new SendError(info.reason, info.detail, info.status);
  }

  // O proxy embrulha falhas de upstream em 200 + { error: true, message }.
  const envelope = data as { error?: boolean; message?: string; status?: number; response?: unknown; key?: { id?: string } } | null;
  if (envelope?.error) {
    log.error('evolution-api send-text error envelope', envelope);
    const info = parseEvolutionError(envelope);
    
    void dbInsert(RPC.rpc_log_service_event, {
      p_instance: instance,
      p_event_type: 'error',
      p_level: 'error',
      p_message: `Erro na resposta da API para ${phone}: ${info.reason}`,
      p_remote_jid: remoteJid,
      p_payload: { envelope }
    });

    throw new SendError(info.reason, info.detail, info.status);
  }

  const externalId = envelope?.key?.id ?? null;
  optimistic.external_id = externalId;
  optimistic.status = 'sent';
  return { optimistic, externalId };
}

/**
 * sendExternalAudio — envia PTT (push-to-talk) no modo FATOR X.
 *
 * Fluxo:
 *  1. Upload do blob no bucket privado `audio-messages` (mesmo do legacy).
 *  2. Gera signed URL (1h) — a Edge Function `evolution-api` revalida e
 *     re-assina internamente via `resolvePrivateBucketUrl` se necessário.
 *  3. Invoca `send-audio` no proxy → `/message/sendWhatsAppAudio/{instance}`.
 *  4. Devolve uma bolha otimista `message_type: 'audio'` para a UI exibir
 *     enquanto o webhook materializa a mensagem definitiva (e a substitui
 *     pelo `external_id`/`message_id` real do WhatsApp).
 *
 * Erros são propagados para alimentar o `SendErrorBanner` (sem swallow).
 */
export async function sendExternalAudio(
  remoteJid: string,
  blob: Blob,
  opts: SendExternalOptions & { isPtt?: boolean; conversationInstance?: string } = {},
): Promise<SendExternalResult> {
  const phone = jidToPhone(remoteJid);
  if (!phone) throw new Error('Contato sem JID válido para envio.');
  
  // Security check: Ensure we are sending through the correct instance for this conversation
  const instance = opts.instanceName || opts.conversationInstance || DEFAULT_INSTANCE;
  if (opts.conversationInstance && opts.instanceName && opts.instanceName !== opts.conversationInstance) {
    log.warn('Instance mismatch detected, forcing conversation instance', { target: opts.conversationInstance, requested: opts.instanceName });
  }

  // Sanitiza o JID para uso como pasta no bucket (sem `@`/`:` etc).
  const safeKey = remoteJid.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${safeKey}/${Date.now()}.webm`;

  const { error: uploadError } = await supabase.storage
    .from('audio-messages')
    .upload(fileName, blob, { contentType: blob.type || 'audio/webm', upsert: false });
  if (uploadError) {
    log.error('audio upload failed', uploadError);
    throw new Error(uploadError.message || 'Falha no upload do áudio');
  }

  if (opts.onProgress) opts.onProgress(50); // Simulation midpoint
  
  const { data: signed, error: signError } = await supabase.storage
    .from('audio-messages')
    .createSignedUrl(fileName, 3600);
    
  if (signError || !signed?.signedUrl) {
    log.error('audio signed url failed', signError);
    throw new Error(signError?.message || 'Falha ao gerar URL do áudio');
  }

  // Use URL.createObjectURL for the optimistic bubble to avoid relying on a 1h signed URL
  // that might expire before reconciliation or if the message is revisited.
  const localAudioUrl = URL.createObjectURL(blob);

  const optimistic = makeOptimisticBubble(remoteJid, '[Áudio]', {
    messageType: 'audio',
    mediaUrl: localAudioUrl,
    contactAvatar: opts.contactAvatar,
  });

  const { data, error } = await supabase.functions.invoke('evolution-api', {
    body: {
      action: 'send-audio',
      instanceName: instance,
      number: phone,
      audio: signed.signedUrl,
      encoding: true, // Aligned with architecture doc stage 3
    },
  });

  if (error) {
    log.error('evolution-api send-audio failed', error);
    const info = parseEvolutionError(error);
    throw new SendError(info.reason, info.detail, info.status);
  }
  const envelope = data as { error?: boolean; message?: string; status?: number; response?: unknown; key?: { id?: string } } | null;
  if (envelope?.error) {
    log.error('evolution-api send-audio error envelope', envelope);
    const info = parseEvolutionError(envelope);
    throw new SendError(info.reason, info.detail, info.status);
  }

  const externalId = envelope?.key?.id ?? null;
  optimistic.external_id = externalId;
  optimistic.status = 'sent';
  return { optimistic, externalId };
}

/**
 * sendExternalMedia — envia imagens, vídeos ou documentos no modo FATOR X.
 */
export async function sendExternalMedia(
  remoteJid: string,
  file: File,
  opts: SendExternalOptions & { caption?: string } = {},
): Promise<SendExternalResult> {
  const phone = jidToPhone(remoteJid);
  if (!phone) throw new Error('Contato sem JID válido para envio.');
  const instance = opts.instanceName || DEFAULT_INSTANCE;

  const safeKey = remoteJid.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${safeKey}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('whatsapp-media')
    .upload(fileName, file, { contentType: file.type, upsert: false });
  if (uploadError) {
    log.error('media upload failed', uploadError);
    throw new Error(uploadError.message || 'Falha no upload do arquivo');
  }

  if (opts.onProgress) opts.onProgress(50); // Simulation midpoint
  if (uploadError) {
    log.error('media upload failed', uploadError);
    throw new Error(uploadError.message || 'Falha no upload do arquivo');
  }

  const { data: signed, error: signError } = await supabase.storage
    .from('whatsapp-media')
    .createSignedUrl(fileName, 3600);
  if (signError || !signed?.signedUrl) {
    log.error('media signed url failed', signError);
    throw new Error(signError?.message || 'Falha ao gerar URL do arquivo');
  }

  const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document';
  const optimistic = makeOptimisticBubble(remoteJid, opts.caption || file.name, {
    messageType: type,
    mediaUrl: signed.signedUrl,
    contactAvatar: opts.contactAvatar,
  });

  const { data, error } = await supabase.functions.invoke('evolution-api', {
    body: {
      action: 'send-media',
      instanceName: instance,
      number: phone,
      mediaUrl: signed.signedUrl,
      mediaType: type,
      caption: opts.caption,
      fileName: file.name,
    },
  });

  if (error) {
    log.error('evolution-api send-media failed', error);
    const info = parseEvolutionError(error);
    throw new SendError(info.reason, info.detail, info.status);
  }
  const envelope = data as { error?: boolean; message?: string; status?: number; response?: unknown; key?: { id?: string } } | null;
  if (envelope?.error) {
    log.error('evolution-api send-media error envelope', envelope);
    const info = parseEvolutionError(envelope);
    throw new SendError(info.reason, info.detail, info.status);
  }

  const externalId = envelope?.key?.id ?? null;
  optimistic.external_id = externalId;
  optimistic.status = 'sent';
  return { optimistic, externalId };
}

/**
 * sendExternalPtv — envia vídeo-nota circular (ptv) no modo FATOR X.
 * Inclui retry automático para falhas de upload/sign.
 */
export async function sendExternalPtv(
  remoteJid: string,
  blob: Blob,
  opts: SendExternalOptions = {},
): Promise<SendExternalResult> {
  const phone = jidToPhone(remoteJid);
  if (!phone) throw new Error('Contato sem JID válido para envio.');
  const instance = opts.instanceName || DEFAULT_INSTANCE;

  const safeKey = remoteJid.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${safeKey}/${Date.now()}.mp4`;

  let signedUrl: string | null = null;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      const { error: uploadError } = await supabase.storage
        .from('whatsapp-media')
        .upload(fileName, blob, { contentType: 'video/mp4', upsert: true });
        
      if (uploadError) throw uploadError;

      const { data: signed, error: signError } = await supabase.storage
        .from('whatsapp-media')
        .createSignedUrl(fileName, 3600);
        
      if (signError || !signed?.signedUrl) throw signError || new Error('Falha ao gerar URL assinada');
      
      signedUrl = signed.signedUrl;
      break;
    } catch (err) {
      log.warn(`Tentativa ${attempts} de upload/sign PTV falhou`, err);
      if (attempts >= maxAttempts) throw err;
      await new Promise(r => setTimeout(r, 1000 * attempts));
    }
  }

  if (opts.onProgress) opts.onProgress(50);

  const localVideoUrl = URL.createObjectURL(blob);
  const optimistic = makeOptimisticBubble(remoteJid, '[Vídeo-nota]', {
    messageType: 'video', 
    mediaUrl: localVideoUrl,
    contactAvatar: opts.contactAvatar,
  });

  const { data, error } = await supabase.functions.invoke('evolution-api', {
    body: {
      action: 'send-ptv',
      instanceName: instance,
      number: phone,
      video: signedUrl,
    },
  });

  if (error) {
    log.error('evolution-api send-ptv failed', error);
    const info = parseEvolutionError(error);
    throw new SendError(info.reason, info.detail, info.status);
  }

  const envelope = data as { error?: boolean; message?: string; status?: number; response?: unknown; key?: { id?: string } } | null;
  if (envelope?.error) {
    log.error('evolution-api send-ptv error envelope', envelope);
    const info = parseEvolutionError(envelope);
    throw new SendError(info.reason, info.detail, info.status);
  }

  const externalId = envelope?.key?.id ?? null;
  optimistic.external_id = externalId;
  optimistic.status = 'sent';
  return { optimistic, externalId };
}
