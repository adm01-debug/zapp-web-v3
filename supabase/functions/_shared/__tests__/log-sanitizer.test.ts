/**
 * Bug 1 (v6 hardening) — secrets must NEVER appear in logs.
 *
 * Adversarial unit tests for `redactSecrets` and the `Logger` integration.
 * Mirrors test cases 2.1–2.4 / Phase-3 spirit of PROMPT_LOVABLE_ZAPPWEB_EVO_BITRIX
 * but stays fully sandbox-local — no network, no real credentials.
 */

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Logger, redactSecrets, _resetSensitiveCacheForTests } from "../validation.ts";

const FAKE_SECRET = "supersecret-webhook-value-1234567890";
const FAKE_BITRIX_URL = "https://example.bitrix24.com.br/rest/1/abcdef1234567890/";

function withEnv(values: Record<string, string>, fn: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(values)) {
    previous[k] = Deno.env.get(k);
    Deno.env.set(k, v);
  }
  _resetSensitiveCacheForTests();
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) Deno.env.delete(k);
      else Deno.env.set(k, v);
    }
    _resetSensitiveCacheForTests();
  }
}

Deno.test("redactSecrets removes WEBHOOK_SHARED_SECRET from messages", () => {
  withEnv({ WEBHOOK_SHARED_SECRET: FAKE_SECRET }, () => {
    const out = redactSecrets(`signature mismatch for ${FAKE_SECRET}`);
    assertEquals(out.includes(FAKE_SECRET), false);
    assertStringIncludes(out, "***REDACTED***");
  });
});

Deno.test("redactSecrets removes BITRIX_WEBHOOK_URL containing token", () => {
  withEnv({ BITRIX_WEBHOOK_URL: FAKE_BITRIX_URL }, () => {
    const out = redactSecrets(`Calling ${FAKE_BITRIX_URL}/crm.lead.add failed`);
    assertEquals(out.includes("abcdef1234567890"), false);
    assertStringIncludes(out, "***REDACTED***");
  });
});

Deno.test("redactSecrets is a no-op when no secrets set", () => {
  withEnv({}, () => {
    const msg = "nothing-sensitive-here";
    assertEquals(redactSecrets(msg), msg);
  });
});

Deno.test("Logger sanitizes secret embedded in message string", () => {
  withEnv({ EVOLUTION_WEBHOOK_SECRET: FAKE_SECRET }, () => {
    const captured: string[] = [];
    const orig = console.log;
    console.log = (s: string) => captured.push(String(s));
    try {
      const log = new Logger("test-fn");
      log.info(`processing with ${FAKE_SECRET}`);
    } finally {
      console.log = orig;
    }
    const blob = captured.join("\n");
    assertEquals(blob.includes(FAKE_SECRET), false, "secret leaked to console.log");
    assertStringIncludes(blob, "***REDACTED***");
  });
});

Deno.test("Logger sanitizes secret nested in ctx", () => {
  withEnv({ WEBHOOK_SECRET: FAKE_SECRET }, () => {
    const captured: string[] = [];
    const orig = console.warn;
    console.warn = (s: string) => captured.push(String(s));
    try {
      const log = new Logger("test-fn");
      log.warn("auth fail", {
        nested: { headers: { "x-webhook-secret": FAKE_SECRET } },
        list: [`token=${FAKE_SECRET}`],
      });
    } finally {
      console.warn = orig;
    }
    const blob = captured.join("\n");
    assertEquals(blob.includes(FAKE_SECRET), false, "secret leaked from nested ctx");
    assertStringIncludes(blob, "***REDACTED***");
  });
});

Deno.test("Logger ignores trivially-short env values (no false positives)", () => {
  withEnv({ WEBHOOK_SECRET: "true" }, () => {
    const captured: string[] = [];
    const orig = console.log;
    console.log = (s: string) => captured.push(String(s));
    try {
      const log = new Logger("test-fn");
      log.info("status is true and ok");
    } finally {
      console.log = orig;
    }
    const blob = captured.join("\n");
    // 'true' should NOT be redacted (length < 12 threshold)
    assert(blob.includes("true"), "short env value should not trigger redaction");
  });
});
