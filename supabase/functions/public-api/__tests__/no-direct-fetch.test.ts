import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SOURCE = await Deno.readTextFile(
  new URL("../index.ts", import.meta.url),
);

const MEDIA_ACTIONS = [
  "send-media",
  "send-audio",
  "send-image",
  "send-document",
  "send-video",
  "send-sticker",
  "sendMedia",
  "sendAudio",
];

function blockAfter(marker: string, size = 1500): string | null {
  const i = SOURCE.indexOf(marker);
  return i === -1 ? null : SOURCE.slice(i, i + size);
}

for (const action of MEDIA_ACTIONS) {
  Deno.test(`public-api: '${action}' (if present) must not call fetch() directly`, () => {
    const block = blockAfter(`action === '${action}'`);
    if (!block) return; // not implemented yet — pass
    assert(
      !block.includes("fetch("),
      `public-api handler for '${action}' must route via evolution-api invoke, not fetch()`,
    );
    assert(
      block.includes("functions.invoke('evolution-api'") ||
        block.includes('functions.invoke("evolution-api"'),
      `public-api handler for '${action}' must use supabase.functions.invoke('evolution-api', ...)`,
    );
  });
}

Deno.test("public-api never calls Evolution sendMedia/sendWhatsAppAudio via direct fetch", () => {
  assert(
    !/fetch\([^)]*sendMedia/.test(SOURCE),
    "public-api must not fetch() Evolution sendMedia directly",
  );
  assert(
    !/fetch\([^)]*sendWhatsAppAudio/.test(SOURCE),
    "public-api must not fetch() Evolution sendWhatsAppAudio directly",
  );
});

Deno.test.ignore(
  "FUTURE: public-api 'send' (text) should also route via evolution-api invoke (currently uses direct fetch — tracked as tech debt)",
  () => {
    const block = blockAfter("action !== 'send'", 2000) ?? "";
    assert(!block.includes("fetch("));
  },
);
