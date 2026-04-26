// WhatsApp Cloud API Webhook
// - GET: Meta verification handshake (hub.mode=subscribe + hub.verify_token + hub.challenge)
// - POST: receives messages/statuses and persists into FATOR X via rpc_insert_message
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const VERIFY_TOKEN = Deno.env.get("WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN") ?? "";
const EXTERNAL_URL = Deno.env.get("EXTERNAL_SUPABASE_URL") ?? "";
const EXTERNAL_KEY = Deno.env.get("EXTERNAL_SUPABASE_ANON_KEY") ?? "";

const externalClient =
  EXTERNAL_URL && EXTERNAL_KEY
    ? createClient(EXTERNAL_URL, EXTERNAL_KEY)
    : null;

function jidFromPhone(phone: string): string {
  const digits = String(phone || "").replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

async function persistInbound(message: any, contact: any) {
  if (!externalClient) return;
  const remoteJid = jidFromPhone(message.from);
  const content =
    message.text?.body ??
    message.image?.caption ??
    message.video?.caption ??
    message.document?.filename ??
    `[${message.type}]`;

  // Best-effort upsert contact
  try {
    await externalClient.rpc("rpc_upsert_contact", {
      p_remote_jid: remoteJid,
      p_instance: "wpp2",
      p_push_name: contact?.profile?.name ?? null,
    });
  } catch (_e) {
    // ignore — contact may already exist
  }

  await externalClient.rpc("rpc_insert_message", {
    p_remote_jid: remoteJid,
    p_content: content,
    p_message_id: message.id,
    p_message_type: message.type ?? "text",
    p_from_me: false,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // GET: Meta verification
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && token === VERIFY_TOKEN) {
      return new Response(challenge ?? "", { status: 200, headers: corsHeaders });
    }
    return new Response("forbidden", { status: 403, headers: corsHeaders });
  }

  // POST: incoming events
  if (req.method === "POST") {
    try {
      const body = await req.json();
      const entries = body?.entry ?? [];
      for (const entry of entries) {
        const changes = entry?.changes ?? [];
        for (const change of changes) {
          const value = change?.value ?? {};
          const messages = value?.messages ?? [];
          const contacts = value?.contacts ?? [];
          for (const msg of messages) {
            const contact = contacts.find(
              (c: any) => c?.wa_id === msg?.from
            );
            try {
              await persistInbound(msg, contact);
            } catch (e) {
              console.error("[whatsapp-cloud-webhook] persist error", e);
            }
          }
          // statuses (delivered/read/failed) — log only for now
          const statuses = value?.statuses ?? [];
          if (statuses.length) {
            console.log(
              "[whatsapp-cloud-webhook] statuses:",
              JSON.stringify(statuses).slice(0, 500)
            );
          }
        }
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      console.error("[whatsapp-cloud-webhook] error", e);
      return new Response(
        JSON.stringify({ ok: false, error: String(e) }),
        {
          status: 200, // ack to avoid Meta retries on bad payload
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  return new Response("method not allowed", {
    status: 405,
    headers: corsHeaders,
  });
});
