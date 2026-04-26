// Edge Function: whatsapp-cloud-webhook
// Receives webhooks from Meta (WhatsApp Cloud API) and writes them into the unified
// FATOR X model (evolution_messages / evolution_contacts) so the Inbox sees them
// the exact same way as Evolution-API messages.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  normalizeMetaPayload, validateMetaSignature,
} from "../_shared/whatsapp-cloud-normalizer.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

interface CredentialsRow {
  connection_id: string;
  phone_number_id: string;
  access_token: string;
  app_secret: string;
  verify_token: string;
  graph_api_version: string;
}

async function fetchMediaUrl(creds: CredentialsRow, mediaId: string): Promise<string | null> {
  const url = `https://graph.facebook.com/${creds.graph_api_version}/${mediaId}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${creds.access_token}` } });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null) as { url?: string } | null;
  return json?.url ?? null;
}

async function downloadAndStore(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  creds: CredentialsRow,
  mediaId: string,
  mimeType: string | undefined,
  wamid: string,
): Promise<string | null> {
  try {
    const directUrl = await fetchMediaUrl(creds, mediaId);
    if (!directUrl) return null;
    const fileRes = await fetch(directUrl, {
      headers: { Authorization: `Bearer ${creds.access_token}` },
    });
    if (!fileRes.ok) return null;
    const buf = new Uint8Array(await fileRes.arrayBuffer());
    const ext = (mimeType?.split('/')[1] ?? 'bin').split(';')[0];
    const safeId = wamid.replace(/[^a-zA-Z0-9]/g, '');
    const path = `cloud/${safeId}.${ext}`;
    const { error } = await supabase.storage.from('whatsapp-media').upload(path, buf, {
      contentType: mimeType ?? 'application/octet-stream',
      upsert: true,
    });
    if (error) {
      console.error('[wa-cloud-webhook] upload error', error);
      return null;
    }
    const { data: signed } = await supabase.storage.from('whatsapp-media').createSignedUrl(path, 60 * 60 * 24 * 7);
    return signed?.signedUrl ?? null;
  } catch (e) {
    console.error('[wa-cloud-webhook] downloadAndStore error', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);

  // ---- 1. Meta verification handshake (GET) ----
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token && challenge) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );
      const { data } = await supabase
        .from('whatsapp_official_credentials')
        .select('id')
        .eq('verify_token', token)
        .limit(1)
        .maybeSingle();
      if (data) return new Response(challenge, { status: 200 });
      return new Response('forbidden', { status: 403 });
    }
    return new Response('bad request', { status: 400 });
  }

  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  // ---- 2. Read raw body for signature validation ----
  const rawBody = await req.text();
  let payload: unknown;
  try { payload = JSON.parse(rawBody); } catch {
    return new Response('invalid json', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { events, phoneNumberId } = normalizeMetaPayload(payload);
  if (!phoneNumberId || events.length === 0) {
    return new Response(JSON.stringify({ ok: true, skipped: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Look up credentials by phone_number_id (which Meta sends in metadata)
  const { data: credsRow } = await supabase
    .from('whatsapp_official_credentials')
    .select('connection_id, phone_number_id, access_token, app_secret, verify_token, graph_api_version')
    .eq('phone_number_id', phoneNumberId)
    .maybeSingle();

  if (!credsRow) {
    console.warn('[wa-cloud-webhook] no credentials for phone_number_id', phoneNumberId);
    return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'unknown_phone_number_id' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const creds = credsRow as CredentialsRow;

  // ---- 3. Validate signature ----
  const sig = req.headers.get('x-hub-signature-256');
  const valid = await validateMetaSignature(rawBody, sig, creds.app_secret);
  if (!valid) {
    console.warn('[wa-cloud-webhook] invalid signature for', phoneNumberId);
    return new Response('invalid signature', { status: 401 });
  }

  // ---- 4. External client (FATOR X) ----
  const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
  const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_ROLE_KEY')
    ?? Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY');
  if (!externalUrl || !externalKey) {
    console.error('[wa-cloud-webhook] FATOR X env vars missing');
    return new Response('config error', { status: 500 });
  }
  const externalClient = createClient(externalUrl, externalKey);

  // ---- 5. Fan out events ----
  const instanceName = `official_${creds.connection_id}`;

  for (const ev of events) {
    if (ev.kind === 'status') {
      try {
        await externalClient
          .from('evolution_messages')
          .update({
            status: ev.status,
            ...(ev.errorMessage ? { error_message: ev.errorMessage } : {}),
          })
          .eq('message_id', ev.wamid);
      } catch (e) {
        console.error('[wa-cloud-webhook] status update failed', e);
      }
      continue;
    }

    // Upsert contact (best-effort, ignored if RPC fails)
    try {
      await externalClient.rpc('rpc_upsert_contact', {
        p_remote_jid: ev.remoteJid,
        p_instance: instanceName,
        p_push_name: ev.pushName ?? null,
      } as Record<string, unknown>);
    } catch (e) {
      console.warn('[wa-cloud-webhook] rpc_upsert_contact failed', e);
    }

    // Resolve media for media-bearing types
    let mediaUrl: string | null = null;
    if (ev.mediaId && ['image', 'audio', 'video', 'document', 'sticker'].includes(ev.messageType)) {
      mediaUrl = await downloadAndStore(supabase, creds, ev.mediaId, ev.mediaMimeType, ev.wamid);
    }

    // Insert message via RPC (idempotent — wamid is unique, RPC handles dedup)
    try {
      await externalClient.rpc('rpc_insert_message', {
        p_remote_jid: ev.remoteJid,
        p_content: ev.content,
        p_message_id: ev.wamid,
        p_from_me: false,
        p_message_type: ev.messageType,
        p_media_url: mediaUrl,
        p_metadata: ev.metadata ?? { source: 'whatsapp_cloud_api' },
      } as Record<string, unknown>);
    } catch (e) {
      console.error('[wa-cloud-webhook] rpc_insert_message failed', e);
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: events.length }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
