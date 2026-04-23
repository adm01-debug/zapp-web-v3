import { assert, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { extractBlock, readSource } from "./_helpers.ts";

const SOURCE = await readSource();
const NEXT_ACTION = /action === '/;

Deno.test("connect handles 401/403 from upstream without recreating instance", () => {
  const block = extractBlock(SOURCE, "action === 'connect'", { until: NEXT_ACTION, maxSize: 6000 });

  // Auth detection on the initial connect call.
  assertMatch(block, /response\.status === 401 \|\| response\.status === 403/);
  // Returns a structured envelope with the auth error code.
  assertMatch(block, /EVOLUTION_AUTH_ERROR/);
  // Auth error message mentions the env vars so user knows what to fix.
  assertMatch(block, /EVOLUTION_API_URL/);
  assertMatch(block, /EVOLUTION_API_KEY/);
  // Auth helper is reused for the create-instance fallback path too.
  assertMatch(block, /buildAuthError\([^)]*'create-instance'\)/);
});

Deno.test("connect never returns a raw 400 — always uses envelope", () => {
  const block = extractBlock(SOURCE, "action === 'connect'", { until: NEXT_ACTION, maxSize: 6000 });

  // The legacy `status: response.ok ? 200 : 400` shortcut must be gone.
  assert(
    !/status: response\.ok \? 200 : 400/.test(block),
    "connect action still uses the legacy 400 fallback — must return a structured envelope instead",
  );
  // And the success branch is an unconditional 200.
  assertMatch(block, /status: 200, headers: \{ \.\.\.corsHeaders/);
});
