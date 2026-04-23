import { assert, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SOURCE = await Deno.readTextFile(
  new URL("../index.ts", import.meta.url),
);

function blockAfter(marker: string, size = 1500): string {
  const i = SOURCE.indexOf(marker);
  if (i === -1) throw new Error(`marker not found: ${marker}`);
  return SOURCE.slice(i, i + size);
}

Deno.test("send-media path includes ${instance}", () => {
  const block = blockAfter("action === 'send-media'", 600);
  assertMatch(block, /\/message\/sendMedia\/\$\{instance\}/);
});

Deno.test("send-audio path includes ${instance} (multi-line block)", () => {
  const block = blockAfter("action === 'send-audio'", 1500);
  assertMatch(block, /\/message\/sendWhatsAppAudio\/\$\{instance\}/);
  assertMatch(block, /return await proxy\(/);
});

Deno.test("instance is resolved from instanceName with fallback", () => {
  assertMatch(SOURCE, /body\.instanceName\s*\|\|\s*body\.instance/);
});

Deno.test("proxy() helper forwards path to proxyToEvolution", () => {
  assertMatch(
    SOURCE,
    /const proxy\s*=\s*\(\s*path:\s*string[\s\S]*?proxyToEvolution\(\s*evolutionApiUrl,\s*evolutionApiKey,\s*corsHeaders,\s*path/,
  );
});

Deno.test("send-media and send-audio never call fetch() directly", () => {
  const media = blockAfter("action === 'send-media'", 600);
  const audio = blockAfter("action === 'send-audio'", 1500);
  assert(!media.includes("fetch("), "send-media must use proxy(), not fetch()");
  assert(!audio.includes("fetch("), "send-audio must use proxy(), not fetch()");
});
