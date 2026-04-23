import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { proxyToEvolution } from "../../_shared/evolution-api-proxy.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*" };
const URL_BASE = "https://evo.example.com";
const KEY = "test-key";

type FetchFn = typeof globalThis.fetch;
const realFetch: FetchFn = globalThis.fetch;

function restoreFetch() {
  globalThis.fetch = realFetch;
}

/**
 * proxyToEvolution swallows network/timeout errors and always returns
 * HTTP 200 with an error envelope body so the browser client can parse it.
 * These tests lock that contract down for the send-media path.
 */

Deno.test({
  name: "send-media: network failure returns 200 + error envelope (504)",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
  globalThis.fetch = () => Promise.reject(new TypeError("network down"));
  try {
    // POST is non-idempotent → no retry, single attempt
    const res = await proxyToEvolution(
      URL_BASE,
      KEY,
      corsHeaders,
      "/message/sendMedia/wpp2",
      "POST",
      { number: "5511999999999", mediatype: "image", media: "https://x/y.jpg" },
    );
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.error, true);
    assertEquals(body.status, 504);
    assert(
      typeof body.message === "string" &&
        body.message.includes("Falha ao conectar com a API Evolution"),
      `unexpected message: ${body.message}`,
    );
    assert(body.message.includes("network down"), "must include cause");
  } finally {
    restoreFetch();
  }
});

Deno.test("send-media: AbortError (timeout) maps to friendly timeout message", async () => {
  globalThis.fetch = () => {
    const err = new Error("aborted");
    err.name = "AbortError";
    return Promise.reject(err);
  };
  try {
    const res = await proxyToEvolution(
      URL_BASE,
      KEY,
      corsHeaders,
      "/message/sendMedia/wpp2",
      "POST",
      { number: "5511999999999" },
    );
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.error, true);
    assertEquals(body.status, 504);
    assert(
      body.message.includes("Timeout"),
      `expected timeout message, got: ${body.message}`,
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("send-media: upstream 500 returns error envelope with friendly message", async () => {
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify({ message: "boom" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
  try {
    const res = await proxyToEvolution(
      URL_BASE,
      KEY,
      corsHeaders,
      "/message/sendMedia/wpp2",
      "POST",
      { number: "5511999999999" },
    );
    // Envelope is always served as HTTP 200 to the client
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.error, true);
    assertEquals(body.status, 500);
    assertExists(body.message);
    assertExists(body.details);
  } finally {
    restoreFetch();
  }
});

Deno.test("send-media: upstream 401 maps to 'Chave de API inválida'", async () => {
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify({ message: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );
  try {
    const res = await proxyToEvolution(
      URL_BASE,
      KEY,
      corsHeaders,
      "/message/sendMedia/wpp2",
      "POST",
      {},
    );
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.error, true);
    assertEquals(body.status, 401);
    assert(
      body.message.includes("Chave de API inválida"),
      `unexpected: ${body.message}`,
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("send-media: upstream 404 maps to 'Instância não encontrada'", async () => {
  globalThis.fetch = () =>
    Promise.resolve(
      new Response(JSON.stringify({ message: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );
  try {
    const res = await proxyToEvolution(
      URL_BASE,
      KEY,
      corsHeaders,
      "/message/sendMedia/missing-instance",
      "POST",
      {},
    );
    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.error, true);
    assertEquals(body.status, 404);
    assert(
      body.message.includes("Instância não encontrada"),
      `unexpected: ${body.message}`,
    );
  } finally {
    restoreFetch();
  }
});

Deno.test("send-media: CORS headers propagated on error envelope", async () => {
  globalThis.fetch = () => Promise.reject(new Error("offline"));
  try {
    const customCors = {
      "Access-Control-Allow-Origin": "https://app.example.com",
      "X-Test-Header": "1",
    };
    const res = await proxyToEvolution(
      URL_BASE,
      KEY,
      customCors,
      "/message/sendMedia/wpp2",
      "POST",
      {},
    );
    assertEquals(
      res.headers.get("Access-Control-Allow-Origin"),
      "https://app.example.com",
    );
    assertEquals(res.headers.get("X-Test-Header"), "1");
    assertEquals(res.headers.get("Content-Type"), "application/json");
    await res.json(); // drain
  } finally {
    restoreFetch();
  }
});
