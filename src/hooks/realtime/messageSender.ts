import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';
import { extractEvolutionMessageId } from '@/lib/evolutionMessageId';
import { invokeEvolutionWithRetry } from '@/lib/evolutionSendRetry';
import { buildSendIdempotencyKey, buildSendIdempotencyKeyFromFingerprint } from '@/lib/sendIdempotency';
import { toast } from '@/hooks/use-toast';
import { emitSendStatus } from './sendStatusBus';

const MAX_RETRIES = 3;
const lastInstabilityToastByContact = new Map<string, number>();

function classifyAuthError(err: unknown): { isAuth: boolean; code?: number; reason?: string } {
  if (!err || typeof err !== 'object') return { isAuth: false };
  const anyErr = err as { status?: number; message?: string; error?: { message?: string } };
  const status = anyErr.status;
  const msg = (anyErr.message || anyErr.error?.message || '').toLowerCase();
  if (status === 401 || status === 403) return { isAuth: true, code: status, reason: anyErr.message };
  if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('invalid token') || msg.includes('invalid api key')) {
    return { isAuth: true, code: status, reason: anyErr.message || msg };
  }
  return { isAuth: false };
}
// Uses RealtimeMessage type from parent hook

const log = getLogger('MessageSender');

interface SendMessageResult {
  id: string;
  contact_id: string | null;
  content: string;
  [key: string]: unknown;
}

/**
 * Resolves the WhatsApp connection to use for sending, with fallback.
 */
async function resolveConnection(contactConnectionId: string | null) {
  let resolvedConnectionId = contactConnectionId;
  let connection: { instance_id: string | null; status: string | null } | null = null;

  if (resolvedConnectionId) {
    const { data } = await supabase
      .from('whatsapp_connections')
      .select('instance_id, status')
      .eq('id', resolvedConnectionId)
      .single();
    connection = data;
  }

  if (!connection?.instance_id || connection.status !== 'connected') {
    const { data: fallback } = await supabase
      .from('whatsapp_connections')
      .select('id, instance_id, status')
      .eq('status', 'connected')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fallback?.instance_id) {
      resolvedConnectionId = fallback.id;
      connection = { instance_id: fallback.instance_id, status: fallback.status };
    }
  }

  return { resolvedConnectionId, connection };
}

/**
 * Builds the Evolution API action and body based on message type.
 */
function buildEvolutionPayload(
  instanceName: string,
  phone: string,
  content: string,
  messageType: string,
  mediaUrl?: string,
  mediaPayload?: string
): { action: string; body: Record<string, unknown> } {
  if (messageType === 'image' && mediaUrl) {
    return {
      action: 'send-media',
      body: { instanceName, number: phone, mediatype: 'image', media: mediaUrl, caption: content !== '[Imagem]' ? content : undefined },
    };
  }
  if (messageType === 'audio' && (mediaPayload || mediaUrl)) {
    return {
      action: 'send-audio',
      body: { instanceName, number: phone, audio: mediaUrl || mediaPayload, encoding: !mediaUrl && Boolean(mediaPayload) },
    };
  }
  if (messageType === 'video' && mediaUrl) {
    return {
      action: 'send-media',
      body: { instanceName, number: phone, mediatype: 'video', media: mediaUrl, caption: content !== '[Vídeo]' ? content : undefined },
    };
  }
  if (messageType === 'document' && mediaUrl) {
    return {
      action: 'send-media',
      body: { instanceName, number: phone, mediatype: 'document', media: mediaUrl, fileName: content },
    };
  }
  if (messageType === 'location') {
    try {
      const loc = JSON.parse(content);
      return {
        action: 'send-location',
        body: { instanceName, number: phone, latitude: loc.latitude, longitude: loc.longitude, name: loc.name || '', address: loc.address || '' },
      };
    } catch {
      log.warn('Invalid location content, sending as text');
    }
  }
  return { action: 'send-text', body: { instanceName, number: phone, text: content } };
}

/**
 * Sends a message: saves to DB, dispatches via Evolution API, updates status.
 */
export async function sendMessageToContact(
  contactId: string,
  content: string,
  messageType = 'text',
  mediaUrl?: string,
  mediaPayload?: string
): Promise<SendMessageResult> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  const { data, error } = await supabase
    .from('messages')
    .insert({
      contact_id: contactId,
      agent_id: profile?.id,
      content,
      sender: 'agent',
      message_type: messageType,
      media_url: mediaUrl || null,
      is_read: true,
      status: 'sending',
    })
    .select()
    .single();

  if (error) {
    log.error('Error saving message to DB:', error);
    throw error;
  }

  emitSendStatus(data.id, { status: 'sending' });

  try {
    const { data: contact } = await supabase
      .from('contacts')
      .select('phone, whatsapp_connection_id')
      .eq('id', contactId)
      .single();

    const { resolvedConnectionId, connection } = await resolveConnection(contact?.whatsapp_connection_id ?? null);

    if (!connection?.instance_id || connection.status !== 'connected') {
      log.warn('WhatsApp connection not active, message marked as failed');
      await supabase.from('messages').update({ status: 'failed' }).eq('id', data.id);
      throw new Error('Nenhuma conexão WhatsApp ativa disponível');
    }

    const phone = contact?.phone?.replace(/\D/g, '');
    if (!phone) {
      throw new Error('Contato sem número de telefone válido');
    }

    const { action, body } = buildEvolutionPayload(connection.instance_id, phone, content, messageType, mediaUrl, mediaPayload);

    // Stable idempotency key per logical message — survives client retries
    // and DLQ reprocess, so a network-recovery retry can't duplicate the
    // WhatsApp message on Evolution's side.
    const idemKey = buildSendIdempotencyKey(data.id);

    const { data: apiResult, error: apiError } = await invokeEvolutionWithRetry(
      action,
      { body, headers: { 'Idempotency-Key': idemKey } },
      {
        idempotencyKey: idemKey,
        maxRetries: MAX_RETRIES,
        onRetry: (attempt, total) => {
          emitSendStatus(data.id, { status: 'retrying', attempt, totalRetries: total });
          // Persist counters so the "2/3" indicator survives a page reload.
          // Fire-and-forget — never block the retry loop.
          supabase.from('messages').update({
            status: 'retrying',
            retry_attempt: attempt,
            retry_total: total,
          }).eq('id', data.id).then(() => undefined, () => undefined);
          const last = lastInstabilityToastByContact.get(contactId) ?? 0;
          if (attempt === 1 && Date.now() - last > 60_000) {
            lastInstabilityToastByContact.set(contactId, Date.now());
            toast({
              title: 'Conexão instável',
              description: `Tentando reenviar… (${attempt}/${total})`,
            });
          }
        },
      }
    );

    if (apiError || (apiResult as { error?: unknown })?.error) {
      const errPayload = apiError || (apiResult as { error?: unknown; message?: string });
      log.error('Evolution API send error:', errPayload);
      const auth = classifyAuthError(errPayload);
      const reason = (apiResult as { message?: string })?.message
        || (apiError as { message?: string } | null)?.message
        || 'Falha ao enviar mensagem';

      if (auth.isAuth) {
        await supabase.from('messages').update({
          status: 'failed_auth',
          whatsapp_connection_id: resolvedConnectionId,
          error_code: auth.code ? String(auth.code) : null,
          error_reason: auth.reason || reason,
        }).eq('id', data.id);
        emitSendStatus(data.id, { status: 'failed_auth', errorCode: auth.code, errorReason: auth.reason || reason });
      } else {
        await supabase.from('messages').update({
          status: 'failed',
          whatsapp_connection_id: resolvedConnectionId,
          error_reason: reason,
        }).eq('id', data.id);
        emitSendStatus(data.id, { status: 'failed', errorReason: reason });
      }
      throw new Error(reason);
    }

    const externalId = extractEvolutionMessageId(apiResult);
    await supabase.from('messages').update({
      status: 'sent',
      external_id: externalId,
      whatsapp_connection_id: resolvedConnectionId,
      retry_attempt: null,
      retry_total: null,
    }).eq('id', data.id);
    emitSendStatus(data.id, { status: 'sent' });
  } catch (evolutionError) {
    log.error('Error sending via Evolution API:', evolutionError);
    const auth = classifyAuthError(evolutionError);
    const reason = evolutionError instanceof Error ? evolutionError.message : 'Falha ao enviar mensagem';
    if (auth.isAuth) {
      await supabase.from('messages').update({
        status: 'failed_auth',
        error_code: auth.code ? String(auth.code) : null,
        error_reason: auth.reason || reason,
      }).eq('id', data.id);
      emitSendStatus(data.id, { status: 'failed_auth', errorCode: auth.code, errorReason: auth.reason || reason });
    } else {
      // If error came from withRetry exhausting attempts, mark failed_retries.
      // Persist final attempt counters so the badge stays after a reload.
      await supabase.from('messages').update({
        status: 'failed_retries',
        error_reason: reason,
        retry_attempt: MAX_RETRIES,
        retry_total: MAX_RETRIES,
      }).eq('id', data.id);
      emitSendStatus(data.id, { status: 'failed_retries', totalRetries: MAX_RETRIES, errorReason: reason });
    }
    throw evolutionError;
  }

  return data as SendMessageResult;
}
