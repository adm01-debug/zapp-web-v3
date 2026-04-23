/**
 * End-to-end integration test for `public-api`.
 *
 * Mocks the Evolution API + Lovable Cloud REST so we can drive the real
 * handler from a synthetic Request and assert that:
 *   1. The function returns HTTP 200 with `success: true` and the same
 *      requestId that came in via `x-request-id`.
 *   2. The `messages` row is updated to `status: 'sent'` with the
 *      `external_id` extracted from the same Evolution envelope that
 *      drove the response — i.e. chat-side state and HTTP status agree.
 *   3. When Evolution returns a non-OK response, the message is marked
 *      `failed` and the function still returns HTTP 200 with the proxied
 *      envelope (so callers can branch on `success`).
 */
import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ─── Env stubs (must be set before importing index.ts) ────────────────────
Deno.env.set("SUPABASE_URL", "https://stub.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "stub-service-key");
Deno.env.set("EVOLUTION_API_URL", "https://evo.stub");
Deno.env.set("EVOLUTION_API_KEY", "stub-evo-key");

// ─── Capture the handler instead of starting a real server ────────────────
type Handler = (req: Request) => Promise<Response> | Response;
let captured: Handler | null = null;
const originalServe = Deno.serve;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (handler: Handler) => {
  captured = handler;
  return { finished: Promise.resolve(), shutdown: () => {} } as unknown as ReturnType<typeof originalServe>;
};

// ─── Mock fetch covering Supabase REST + Evolution API ────────────────────
interface CapturedCall {
  url: string;
  method: string;
  body: unknown;
}
const calls: CapturedCall[] = [];
let evolutionResponse: { ok: boolean; body: unknown } = {
  ok: true,
  body: { key: { id: "WAMSG_FROM_EVOLUTION_123" }, status: "PENDING" },
};

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  let body: unknown = undefined;
  if (init?.body) {
    try { body = JSON.parse(init.body as string); } catch { body = init.body; }
  }
  calls.push({ url, method, body });

  // Supabase global_settings (api_token check)
  if (url.includes("/rest/v1/global_settings")) {
    return jsonRes([{ value: "valid-token" }]);
  }
  // whatsapp_connections lookup
  if (url.includes("/rest/v1/whatsapp_connections")) {
    return jsonRes([{
      id: "conn-1",
      instance_id: "wpp2",
      status: "connected",
      is_default: true,
    }]);
  }
  // contacts: GET returns an existing contact so we skip the insert path
  if (url.includes("/rest/v1/contacts") && method === "GET") {
    return jsonRes([{ id: "contact-1" }]);
  }
  // messages insert
  if (url.includes("/rest/v1/messages") && method === "POST") {
    return jsonRes([{ id: "msg-1", status: "sending" }]);
  }
  // messages update (PATCH)
  if (url.includes("/rest/v1/messages") && method === "PATCH") {
    return jsonRes([{ id: "msg-1", ...(body as Record<string, unknown>) }]);
  }
  // Evolution API send
  if (url.includes("/message/sendText/")) {
    return jsonRes(evolutionResponse.body, evolutionResponse.ok ? 200 : 500);
  }

  return jsonRes({ unhandled: true, url }, 404);
};

// Now import the handler — top-level Deno.serve will be captured above.
await import("../index.ts");
assertExists(captured, "public-api did not register a handler via Deno.serve");
const handler = captured!;

function makeReq(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://stub/public-api", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": "valid-token",
      "x-request-id": "trace-abc-123",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function reset() {
  calls.length = 0;
  evolutionResponse = {
    ok: true,
    body: { key: { id: "WAMSG_FROM_EVOLUTION_123" }, status: "PENDING" },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────

Deno.test("public-api: success — returns 200, propagates requestId, and updates messages.status='sent' with external_id from same envelope", async () => {
  reset();
  const res = await handler(makeReq({
    action: "send",
    number: "5511999990000",
    message: "Hello world",
  }));

  assertEquals(res.status, 200);
  const json = await res.json();
  assertEquals(json.success, true);
  assertEquals(json.messageId, "msg-1");
  assertEquals(json.requestId, "trace-abc-123");

  // Find the PATCH that marks the message as sent.
  const patches = calls.filter(c => c.method === "PATCH" && c.url.includes("/rest/v1/messages"));
  assert(patches.length >= 1, `expected at least one messages PATCH, got ${patches.length}`);
  const sentPatch = patches.find(p => (p.body as Record<string, unknown>)?.status === "sent");
  assertExists(sentPatch, "expected a PATCH setting status='sent'");
  const patchBody = sentPatch!.body as Record<string, unknown>;
  // The external_id MUST come from the same Evolution envelope used to
  // build the response — i.e. extractEvolutionMessageId(envelope).
  assertEquals(patchBody.external_id, "WAMSG_FROM_EVOLUTION_123");
  assertEquals(patchBody.status, "sent");
});

Deno.test("public-api: failure — Evolution returns non-OK, message is marked 'failed' but HTTP stays 200", async () => {
  reset();
  evolutionResponse = { ok: false, body: { error: "instance offline" } };

  const res = await handler(makeReq({
    action: "send",
    number: "5511999990000",
    message: "Will fail",
  }));

  // public-api swallows Evolution failures into the success envelope (it
  // already saved the message), so HTTP remains 200 — matching the chat
  // path which also keeps the row and flips status='failed'.
  assertEquals(res.status, 200);
  const failPatch = calls.find(c =>
    c.method === "PATCH" &&
    c.url.includes("/rest/v1/messages") &&
    (c.body as Record<string, unknown>)?.status === "failed"
  );
  assertExists(failPatch, "expected a PATCH setting status='failed' on Evolution error");
});

Deno.test("public-api: rejects missing x-api-key with 401", async () => {
  reset();
  const req = new Request("https://stub/public-api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "send", number: "5511999990000", message: "x" }),
  });
  const res = await handler(req);
  assertEquals(res.status, 401);
});

// ─── Cleanup (in case the runner reuses the global env) ──────────────────
globalThis.addEventListener("unload", () => {
  globalThis.fetch = originalFetch;
  // deno-lint-ignore no-explicit-any
  (Deno as any).serve = originalServe;
});
