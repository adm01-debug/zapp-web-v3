import {
  assert,
  assertEquals,
  assertMatch,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { proxyToEvolution } from "../../_shared/evolution-api-proxy.ts";
import {
  CORS_DEFAULT,
  extractBlock,
  KEY,
  leakSafeOpts,
  readSource,
  URL_BASE,
  withFetchStub,
} from "./_helpers.ts";

/**
 * Coverage for `action === 'send-sticker'`.
 *
 * Note: the generic guard "instance é resolvida de `instanceName` com fallback"
 * lives in `send-media-audio-instance.test.ts` and its regex
 * `body\.instanceName\s*\|\|\s*body\.instance` already covers the sticker
 * handler — we don't duplicate it here.
 */

const SOURCE = await readSource();
const NEXT_ACTION = /action === '/;

Deno.test("send-sticker path includes ${instance}", () => {
  const block = extractBlock(SOURCE, "action === 'send-sticker'", {
    until: NEXT_ACTION,
  });
  assertMatch(block, /\/message\/sendSticker\/\$\{instance\}/);
});

Deno.test("send-sticker uses proxy(), not fetch() directly", () => {
  const block = extractBlock(SOURCE, "action === 'send-sticker'", {
    until: NEXT_ACTION,
  });
  assert(!block.includes("fetch("), "send-sticker must use proxy(), not fetch()");
});

Deno.test("send-sticker resolves private bucket URL before sending", () => {
  const block = extractBlock(SOURCE, "action === 'send-sticker'", {
    until: NEXT_ACTION,
  });
  assertMatch(block, /resolvePrivateBucketUrl\(/);
});

Deno.test("send-sticker delegates to shared proxy with `return await proxy(`", () => {
  const block = extractBlock(SOURCE, "action === 'send-sticker'", {
    until: NEXT_ACTION,
  });
  assertMatch(block, /return await proxy\(/);
});

Deno.test({
  ...leakSafeOpts,
  name: "proxy receives correct instance in sendSticker URL",
  fn: async () => {
    let capturedUrl = "";
    await withFetchStub(
      // deno-lint-ignore no-explicit-any
      ((input: any) => {
        capturedUrl = typeof input === "string" ? input : input.toString();
        return Promise.resolve(
          new Response(JSON.stringify({ key: { id: "msg_1" } }), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }) as typeof fetch,
      async () => {
        const res = await proxyToEvolution(
          URL_BASE,
          KEY,
          CORS_DEFAULT,
          "/message/sendSticker/wpp2",
          "POST",
          { number: "5511999999999", sticker: "https://example.com/s.webp" },
        );
        await res.text();
      },
    );
    assertEquals(capturedUrl, `${URL_BASE}/message/sendSticker/wpp2`);
  },
});

Deno.test({
  ...leakSafeOpts,
  name: "missing instance surfaces as `/sendSticker/undefined` in proxy URL",
  fn: async () => {
    let capturedUrl = "";
    await withFetchStub(
      // deno-lint-ignore no-explicit-any
      ((input: any) => {
        capturedUrl = typeof input === "string" ? input : input.toString();
        return Promise.resolve(
          new Response(JSON.stringify({}), {
            status: 200,
            headers: { "content-type": "application/json" },
          }),
        );
      }) as typeof fetch,
      async () => {
        const instance = undefined as unknown as string;
        const res = await proxyToEvolution(
          URL_BASE,
          KEY,
          CORS_DEFAULT,
          `/message/sendSticker/${instance}`,
          "POST",
          { number: "5511999999999", sticker: "https://example.com/s.webp" },
        );
        await res.text();
      },
    );
    assertEquals(capturedUrl, `${URL_BASE}/message/sendSticker/undefined`);
  },
});
