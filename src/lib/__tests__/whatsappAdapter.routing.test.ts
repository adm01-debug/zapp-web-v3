import { describe, it, expect, beforeEach, vi } from "vitest";

const invokeMock = vi.fn();
const rpcMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
    rpc: (...a: unknown[]) => rpcMock(...a),
  },
}));

import {
  sendText,
  sendMedia,
  sendReaction,
  sendTemplate,
  sendPresence,
  getActiveWebhookUrl,
  invalidateWhatsAppModeCache,
} from "../whatsappAdapter";

function setMode(mode: "official" | "unofficial", opts?: { cloudCreds?: "ok" | "missing" }) {
  invalidateWhatsAppModeCache();
  rpcMock.mockResolvedValue({ data: mode, error: null });
  const credsOk = (opts?.cloudCreds ?? "ok") === "ok";
  // Quando o adapter pergunta status dos secrets do Cloud, retorna config solicitada.
  invokeMock.mockImplementation((fn: string) => {
    if (fn === "whatsapp-cloud-secrets-status") {
      return Promise.resolve({
        data: {
          secrets: [
            { name: "WHATSAPP_CLOUD_PHONE_NUMBER_ID", configured: credsOk, length: credsOk ? 16 : 0 },
            { name: "WHATSAPP_CLOUD_ACCESS_TOKEN", configured: credsOk, length: credsOk ? 200 : 0 },
            { name: "WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN", configured: credsOk, length: credsOk ? 36 : 0 },
            { name: "WHATSAPP_CLOUD_APP_SECRET", configured: credsOk, length: credsOk ? 32 : 0 },
          ],
        },
        error: null,
      });
    }
    return Promise.resolve({ data: { ok: true }, error: null });
  });
}

beforeEach(() => {
  invokeMock.mockReset();
  rpcMock.mockReset();
});

describe("whatsappAdapter — roteamento por modo", () => {
  it("sendText em modo unofficial → evolution-api action send-text", async () => {
    setMode("unofficial");
    await sendText({ remoteJid: "5511988887777@s.whatsapp.net", text: "oi" });
    const [fn, opts] = invokeMock.mock.calls[0];
    expect(fn).toBe("evolution-api");
    expect(opts.body.action).toBe("send-text");
    expect(opts.body.number).toBe("5511988887777");
    expect(opts.body.text).toBe("oi");
  });

  it("sendText em modo official → whatsapp-cloud-send", async () => {
    setMode("official");
    await sendText({ remoteJid: "5511988887777@s.whatsapp.net", text: "oi" });
    const sendCall = invokeMock.mock.calls.find(([fn]) => fn === "whatsapp-cloud-send");
    expect(sendCall).toBeDefined();
    expect(sendCall![1].body.type).toBe("text");
    expect(sendCall![1].body.to).toBe("5511988887777");
  });

  it("sendText em modo official com secrets faltando → fallback evolution", async () => {
    setMode("official", { cloudCreds: "missing" });
    await sendText({ remoteJid: "5511988887777@s.whatsapp.net", text: "oi" });
    const sendCall = invokeMock.mock.calls.find(([fn]) => fn === "evolution-api");
    expect(sendCall).toBeDefined();
    expect(sendCall![1].body.action).toBe("send-text");
    // Não deve ter ido para o cloud
    expect(invokeMock.mock.calls.some(([fn]) => fn === "whatsapp-cloud-send")).toBe(false);
  });

  it("sendMedia normaliza filename/mimetype para evolution", async () => {
    setMode("unofficial");
    await sendMedia({
      remoteJid: "5511@s.whatsapp.net",
      mediaUrl: "https://x/a.jpg",
      type: "image",
      filename: "a.jpg",
      mimetype: "image/jpeg",
    });
    const body = invokeMock.mock.calls[0][1].body;
    expect(body.action).toBe("send-media");
    expect(body.fileName).toBe("a.jpg");
    expect(body.mediaType).toBe("image");
  });

  it("sendReaction monta key { remoteJid, id, fromMe } no modo evolution", async () => {
    setMode("unofficial");
    await sendReaction({ remoteJid: "abc@s.whatsapp.net", messageId: "MID", reaction: "❤️" });
    const body = invokeMock.mock.calls[0][1].body;
    expect(body.action).toBe("send-reaction");
    expect(body.key).toEqual({ remoteJid: "abc@s.whatsapp.net", id: "MID", fromMe: true });
    expect(body.reaction).toBe("❤️");
  });

  it("sendTemplate lança erro fora do modo official", async () => {
    setMode("unofficial");
    await expect(
      sendTemplate({ remoteJid: "x@s.whatsapp.net", name: "boas_vindas" }),
    ).rejects.toThrow(/oficial/i);
  });

  it("sendPresence é no-op no modo official (skipped)", async () => {
    setMode("official");
    const r = await sendPresence({ remoteJid: "x@s.whatsapp.net", presence: "composing" });
    expect(invokeMock.mock.calls.some(([fn]) => fn === "evolution-api" || fn === "whatsapp-cloud-send")).toBe(false);
    expect(r).toMatchObject({ skipped: true });
  });

  it("getActiveWebhookUrl alterna por modo", async () => {
    setMode("unofficial");
    expect(await getActiveWebhookUrl()).toContain("/evolution-webhook");
    setMode("official");
    expect(await getActiveWebhookUrl()).toContain("/whatsapp-cloud-webhook");
  });
});
