/**
 * Bug 2 (v6 hardening) — Bitrix origin validation.
 *
 * Adversarial unit tests for `validateBitrixOrigin`. Mirrors smoke tests
 * 2.1–2.4 of PROMPT_LOVABLE_ZAPPWEB_EVO_BITRIX but runs entirely in-sandbox
 * with synthetic Request objects — no deployed function, no external calls.
 */

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { validateBitrixOrigin } from "../../_shared/validation.ts";

function makeReq(origin?: string | null): Request {
  const headers = new Headers();
  if (origin != null) headers.set("origin", origin);
  return new Request("https://example.supabase.co/functions/v1/bitrix-api", {
    method: "POST",
    headers,
  });
}

Deno.test("accepts subdomain of bitrix24.com.br", () => {
  const r = validateBitrixOrigin(makeReq("https://promo-brindes.bitrix24.com.br"), null);
  assertEquals(r.ok, true);
});

Deno.test("accepts apex bitrix24.com.br", () => {
  const r = validateBitrixOrigin(makeReq("https://bitrix24.com.br"), null);
  assertEquals(r.ok, true);
});

Deno.test("accepts exact match against BITRIX_PORTAL", () => {
  const portal = "https://my-portal.bitrix24.de";
  const r = validateBitrixOrigin(makeReq(portal), portal);
  assertEquals(r.ok, true);
});

Deno.test("rejects unrelated origin", () => {
  const r = validateBitrixOrigin(makeReq("https://attacker.evil.com"), null);
  assertEquals(r.ok, false);
  assertEquals(r.reason, "untrusted_origin");
});

Deno.test("rejects missing Origin header", () => {
  const r = validateBitrixOrigin(makeReq(null), null);
  assertEquals(r.ok, false);
  assertEquals(r.reason, "missing_origin");
});

Deno.test("rejects suffix-attack hostname (fake-bitrix24.com.br.evil.com)", () => {
  const r = validateBitrixOrigin(
    makeReq("https://fake-bitrix24.com.br.evil.com"),
    null,
  );
  assertEquals(r.ok, false);
  assertEquals(r.reason, "untrusted_origin");
});

Deno.test("rejects look-alike domain (bitrix24-com-br.evil.com)", () => {
  const r = validateBitrixOrigin(
    makeReq("https://bitrix24-com-br.evil.com"),
    null,
  );
  assertEquals(r.ok, false);
});

Deno.test("rejects malformed origin string", () => {
  const r = validateBitrixOrigin(makeReq("not-a-url"), null);
  assertEquals(r.ok, false);
  assertEquals(r.reason, "malformed_origin");
});

Deno.test("BITRIX_PORTAL only matches exactly, not as substring", () => {
  const portal = "https://real-portal.bitrix24.de";
  const r = validateBitrixOrigin(
    makeReq("https://real-portal.bitrix24.de.evil.com"),
    portal,
  );
  assertEquals(r.ok, false);
});
