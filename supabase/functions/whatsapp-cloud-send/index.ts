// WhatsApp Cloud API sender — text, media, template
// Auth: requires JWT (validated below). Body schema validated with Zod.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_CLOUD_PHONE_NUMBER_ID") ?? "";
const ACCESS_TOKEN = Deno.env.get("WHATSAPP_CLOUD_ACCESS_TOKEN") ?? "";
const GRAPH_VERSION = "v21.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const SendSchema = z.object({
  to: z.string().min(5), // E.164 phone w/o '+'
  type: z.enum(["text", "image", "video", "audio", "document", "template"]),
  text: z.string().optional(),
  mediaUrl: z.string().url().optional(),
  caption: z.string().optional(),
  filename: z.string().optional(),
  template: z
    .object({
      name: z.string(),
      language: z.string().default("pt_BR"),
      components: z.array(z.any()).optional(),
    })
    .optional(),
});

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  // JWT validation
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  try {
    const supa = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "unauthorized" }, 401);
    }
  } catch {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
    return jsonResponse(
      {
        error: "cloud_api_not_configured",
        message:
          "WHATSAPP_CLOUD_PHONE_NUMBER_ID e WHATSAPP_CLOUD_ACCESS_TOKEN não configurados.",
      },
      503
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(
      { error: "validation_error", details: parsed.error.flatten() },
      400
    );
  }
  const p = parsed.data;

  // Build Graph payload
  const payload: Record<string, unknown> = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: p.to,
    type: p.type,
  };

  switch (p.type) {
    case "text":
      if (!p.text) return jsonResponse({ error: "text_required" }, 400);
      payload.text = { body: p.text, preview_url: false };
      break;
    case "image":
    case "video":
    case "audio":
      if (!p.mediaUrl) return jsonResponse({ error: "media_url_required" }, 400);
      payload[p.type] = {
        link: p.mediaUrl,
        ...(p.caption && p.type !== "audio" ? { caption: p.caption } : {}),
      };
      break;
    case "document":
      if (!p.mediaUrl) return jsonResponse({ error: "media_url_required" }, 400);
      payload.document = {
        link: p.mediaUrl,
        ...(p.caption ? { caption: p.caption } : {}),
        ...(p.filename ? { filename: p.filename } : {}),
      };
      break;
    case "template":
      if (!p.template) return jsonResponse({ error: "template_required" }, 400);
      payload.template = {
        name: p.template.name,
        language: { code: p.template.language },
        ...(p.template.components ? { components: p.template.components } : {}),
      };
      break;
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error(
        "[whatsapp-cloud-send] graph error",
        r.status,
        JSON.stringify(data).slice(0, 500)
      );
      return jsonResponse(
        { error: "graph_error", status: r.status, details: data },
        502
      );
    }
    const waMsgId = data?.messages?.[0]?.id ?? null;
    return jsonResponse({ ok: true, messageId: waMsgId, raw: data });
  } catch (e) {
    console.error("[whatsapp-cloud-send] fetch error", e);
    return jsonResponse({ error: "fetch_error", message: String(e) }, 502);
  }
});
