import { supabase } from "@/integrations/supabase/client";

export type WhatsAppMode = "official" | "unofficial";

let cachedMode: WhatsAppMode | null = null;
let cacheExpiresAt = 0;

export async function getWhatsAppMode(force = false): Promise<WhatsAppMode> {
  const now = Date.now();
  if (!force && cachedMode && now < cacheExpiresAt) return cachedMode;
  try {
    const { data, error } = await supabase.rpc("rpc_get_whatsapp_mode" as any);
    if (error) throw error;
    const mode = (data as string) === "official" ? "official" : "unofficial";
    cachedMode = mode;
    cacheExpiresAt = now + 30_000; // 30s cache
    return mode;
  } catch (e) {
    console.warn("[whatsappAdapter] getWhatsAppMode fallback", e);
    return "unofficial";
  }
}

export function invalidateWhatsAppModeCache() {
  cachedMode = null;
  cacheExpiresAt = 0;
}

export interface SendTextParams {
  remoteJid: string; // e.g. 5511999999999@s.whatsapp.net
  text: string;
  instance?: string;
}

export interface SendMediaParams {
  remoteJid: string;
  mediaUrl: string;
  type: "image" | "video" | "audio" | "document";
  caption?: string;
  filename?: string;
  instance?: string;
}

export interface SendTemplateParams {
  remoteJid: string;
  name: string;
  language?: string;
  components?: any[];
}

function jidToPhone(remoteJid: string): string {
  return String(remoteJid).split("@")[0].replace(/\D/g, "");
}

async function invokeCloud(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke(
    "whatsapp-cloud-send",
    { body }
  );
  if (error) throw error;
  if (data && typeof data === "object" && "error" in data) {
    throw new Error((data as any).error ?? "cloud_send_failed");
  }
  return data;
}

async function invokeEvolution(action: string, body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("evolution-api", {
    body: { action, ...body },
  });
  if (error) throw error;
  return data;
}

export async function sendText(params: SendTextParams) {
  const mode = await getWhatsAppMode();
  if (mode === "official") {
    return invokeCloud({
      to: jidToPhone(params.remoteJid),
      type: "text",
      text: params.text,
    });
  }
  return invokeEvolution("sendText", {
    instance: params.instance ?? "wpp2",
    number: jidToPhone(params.remoteJid),
    text: params.text,
  });
}

export async function sendMedia(params: SendMediaParams) {
  const mode = await getWhatsAppMode();
  if (mode === "official") {
    return invokeCloud({
      to: jidToPhone(params.remoteJid),
      type: params.type,
      mediaUrl: params.mediaUrl,
      caption: params.caption,
      filename: params.filename,
    });
  }
  return invokeEvolution("sendMedia", {
    instance: params.instance ?? "wpp2",
    number: jidToPhone(params.remoteJid),
    mediaUrl: params.mediaUrl,
    mediaType: params.type,
    caption: params.caption,
    fileName: params.filename,
  });
}

export async function sendTemplate(params: SendTemplateParams) {
  const mode = await getWhatsAppMode();
  if (mode !== "official") {
    throw new Error(
      "Templates exigem modo oficial (Cloud API). Ative o modo oficial nas configurações."
    );
  }
  return invokeCloud({
    to: jidToPhone(params.remoteJid),
    type: "template",
    template: {
      name: params.name,
      language: params.language ?? "pt_BR",
      components: params.components,
    },
  });
}

/**
 * URL pública do webhook a configurar no painel Meta (somente leitura).
 */
export function getCloudWebhookUrl(): string {
  const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID ?? "";
  return `https://${projectId}.supabase.co/functions/v1/whatsapp-cloud-webhook`;
}
