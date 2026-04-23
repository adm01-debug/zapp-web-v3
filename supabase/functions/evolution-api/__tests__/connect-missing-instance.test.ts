import { assert, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractBlock, readSource } from "./_helpers.ts";

const SOURCE = await readSource();
const NEXT_ACTION = /action === '/;

Deno.test("connect recreates missing instance before retrying", () => {
  const block = extractBlock(SOURCE, "action === 'connect'", {
    until: NEXT_ACTION,
  });

  assertMatch(block, /response\.status === 404/);
  assertMatch(block, /does not exist\|not found/i);
  assertMatch(block, /fetch\(`\$\{evolutionApiUrl\}\/instance\/create`/);
  assertMatch(block, /\(\{ response, data \} = await doConnect\(\)\)/);
});