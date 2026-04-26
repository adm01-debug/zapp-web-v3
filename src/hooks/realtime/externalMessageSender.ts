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
import type { RealtimeMessage } from '@/hooks/useRealtimeMessages';
import { getLogger } from '@/lib/logger';
import { parseEvolutionError } from '@/hooks/realtime/parseEvolutionError';

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
}

export interface SendExternalResult {
  optimistic: RealtimeMessage;
  externalId: string | null;
}

function makeOptimisticBubble(
  remoteJid: string,
  content: string,
  opts: { messageType?: string; mediaUrl?: string | null } = {},
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

  const optimistic = makeOptimisticBubble(remoteJid, content);

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
    throw new SendError(info.reason, info.detail, info.status);
  }

  // O proxy embrulha falhas de upstream em 200 + { error: true, message }.
  const envelope = data as { error?: boolean; message?: string; status?: number; response?: unknown; key?: { id?: string } } | null;
  if (envelope?.error) {
    log.error('evolution-api send-text error envelope', envelope);
    const info = parseEvolutionError(envelope);
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
  opts: SendExternalOptions = {},
): Promise<SendExternalResult> {
  const phone = jidToPhone(remoteJid);
  if (!phone) throw new Error('Contato sem JID válido para envio.');
  const instance = opts.instanceName || DEFAULT_INSTANCE;

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

  const { data: signed, error: signError } = await supabase.storage
    .from('audio-messages')
    .createSignedUrl(fileName, 3600);
  if (signError || !signed?.signedUrl) {
    log.error('audio signed url failed', signError);
    throw new Error(signError?.message || 'Falha ao gerar URL do áudio');
  }

  const optimistic = makeOptimisticBubble(remoteJid, '[Áudio]', {
    messageType: 'audio',
    mediaUrl: signed.signedUrl,
  });

  const { data, error } = await supabase.functions.invoke('evolution-api', {
    body: {
      action: 'send-audio',
      instanceName: instance,
      number: phone,
      audio: signed.signedUrl,
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
