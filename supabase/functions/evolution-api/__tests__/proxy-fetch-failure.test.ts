import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { proxyToEvolution } from "../../_shared/evolution-api-proxy.ts";
import {
  CORS_DEFAULT,
  KEY,
  leakSafeOpts,
  URL_BASE,
  withFetchStub,
} from "./_helpers.ts";

/**
 * proxyToEvolution swallows network/timeout errors and always returns
 * HTTP 200 with an error envelope body so the browser client can parse it.
 * These tests lock that contract down for the send-media path.
 *
 * See `leakSafeOpts` in _helpers.ts for why op/resource sanitizers are off.
 */

Deno.test({
  ...leakSafeOpts,
  name: "send-media: network failure returns 200 + error envelope (504)",
  fn: () =>
    withFetchStub(
      () => Promise.reject(new TypeError("network down")),
      async () => {
        const res = await proxyToEvolution(
          URL_BASE,
          KEY,
          CORS_DEFAULT,
          "/message/sendMedia/wpp2",
          "POST",
          { number: "5511999999999", mediatype: "image" },
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
      },
    ),
});

Deno.test({
  ...leakSafeOpts,
  name: "send-media: AbortError (timeout) maps to friendly timeout message",
  fn: () =>
    withFetchStub(
      () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        return Promise.reject(err);
      },
      async () => {
        const res = await proxyToEvolution(
          URL_BASE,
          KEY,
          CORS_DEFAULT,
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
      },
    ),
});

Deno.test("send-media: upstream 500 returns error envelope with friendly message", () =>
  withFetchStub(
    () =>
      Promise.resolve(
        new Response(JSON.stringify({ message: "boom" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    async () => {
      const res = await proxyToEvolution(
        URL_BASE,
        KEY,
        CORS_DEFAULT,
        "/message/sendMedia/wpp2",
        "POST",
        { number: "5511999999999" },
      );
      assertEquals(res.status, 200);
      const body = await res.json();
      assertEquals(body.error, true);
      assertEquals(body.status, 500);
      assertExists(body.message);
      assertExists(body.details);
    },
  ));

Deno.test("send-media: upstream 401 maps to 'Chave de API inválida'", () =>
  withFetchStub(
    () =>
      Promise.resolve(
        new Response(JSON.stringify({ message: "unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    async () => {
      const res = await proxyToEvolution(
        URL_BASE,
        KEY,
        CORS_DEFAULT,
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
    },
  ));

Deno.test("send-media: upstream 404 maps to 'Instância não encontrada'", () =>
  withFetchStub(
    () =>
      Promise.resolve(
        new Response(JSON.stringify({ message: "not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    async () => {
      const res = await proxyToEvolution(
        URL_BASE,
        KEY,
        CORS_DEFAULT,
        "/message/sendMedia/missing",
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
    },
  ));

Deno.test({
  ...leakSafeOpts,
  name: "send-media: CORS headers propagated on error envelope",
  fn: () =>
    withFetchStub(
      () => Promise.reject(new Error("offline")),
      async () => {
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
        await res.json();
      },
    ),
});
