import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  extractBlock,
  readSourceFrom,
} from "../../_shared/test-helpers.ts";

const SOURCE = await readSourceFrom(import.meta.url, "../index.ts");

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

Deno.test("public-api 'send' (text) routes via evolution-api invoke and not direct fetch", () => {
  // Block runs from the action-equality check up to (but not including) the
  // start of the next action handler, or the end of file.
  const block = extractBlock(SOURCE, "action !== 'send'", {
    until: /action === '/,
    maxSize: 4000,
  });
  assert(
    !/fetch\(/.test(block),
    "public-api 'send' handler must NOT call fetch() directly anymore",
  );
  assert(
    block.includes("functions.invoke('evolution-api'") ||
      block.includes('functions.invoke("evolution-api"'),
    "public-api 'send' handler must use supabase.functions.invoke('evolution-api', ...)",
  );
});
