/**
 * Regressão: `getLogger` precisa continuar exportado por `_shared/logger.ts`.
 *
 * O rewrite do logger (PR #1533, 2026-09-06) trocou a API para
 * `makeLogger(ctx)`/`rootLogger` e removeu `getLogger` sem atualizar os 77
 * módulos em `supabase/functions/_shared` que ainda fazem
 * `const log = getLogger('nome-do-servico')` no top-level (ex.: `sentry.ts`,
 * `auth.ts`, `evolution-webhook-handlers.ts`). Um top-level import quebrado
 * derruba o boot do main worker inteiro das edge functions — não só o
 * módulo que importa (achado do Gate 6 — "edge functions parse-check" —
 * nos PRs #1539/#1540: `Uncaught SyntaxError: The requested module
 * './logger.ts' does not provide an export named 'getLogger'`).
 */
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { getLogger } from "../logger.ts";

Deno.test("getLogger: continua exportado e retorna um Logger funcional", () => {
  const log = getLogger("logger-getlogger-export-test");
  assertExists(log);
  assertEquals(typeof log.debug, "function");
  assertEquals(typeof log.info, "function");
  assertEquals(typeof log.warn, "function");
  assertEquals(typeof log.error, "function");
  assertEquals(typeof log.child, "function");
});

Deno.test("getLogger: não lança ao logar (nunca deve quebrar o hot path)", () => {
  const log = getLogger("logger-getlogger-export-test");
  log.info("mensagem de teste", { foo: "bar" });
  log.error("erro de teste");
});

Deno.test("log.error aceita unknown/Error direto como 2º argumento (padrão dos 382 call-sites existentes)", () => {
  const log = getLogger("logger-getlogger-export-test");
  // Sem a normalização em normalizeCtx(), qualquer um destes falha o Parse
  // gate (`deno check`) com TS2345 — unknown não é atribuível a LogContext.
  log.error("erro de teste", new Error("boom"));
  log.error("erro de teste", "string crua");
  log.error("erro de teste", { code: 42 });
  log.error("erro de teste", undefined);
});
