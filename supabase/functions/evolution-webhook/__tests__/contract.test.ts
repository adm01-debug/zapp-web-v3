/**
 * Testes de regressão (estáticos) do evolution-webhook.
 *
 * Garantem que contratos críticos não regridam:
 *  - Validação HMAC habilitada quando há WEBHOOK_SECRET (com STRICT_MODE).
 *  - Idempotência por hash (instance:event:bodyHash) e short-circuit em duplicatas.
 *  - Auditoria persistida em rejected/duplicate/processed/error.
 *  - Erros de handler não retornam 5xx para a Evolution (evita retry-storm).
 *  - JSON inválido => 400 + audit rejected.
 *  - CORS pre-flight tratado antes de qualquer leitura de body.
 *  - Cobertura mínima de eventos roteados (PRESENCE/CONTACTS/CHATS/CALL/LABELS).
 */
import { assert, assertMatch } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { hasMarker, readSource } from "./_helpers.ts";

const SOURCE = await readSource();

Deno.test("HMAC: lê WEBHOOK_SECRET (ou EVOLUTION_WEBHOOK_SECRET) e instala validador", () => {
  assertMatch(SOURCE, /EVOLUTION_WEBHOOK_SECRET/);
  assertMatch(SOURCE, /WEBHOOK_SECRET/);
  assertMatch(SOURCE, /createWebhookValidator\(WEBHOOK_SECRET, STRICT_MODE\)/);
});

Deno.test("HMAC: assinatura inválida => 401 + audit rejected", () => {
  assertMatch(SOURCE, /if \(!result\.valid\)/);
  assertMatch(SOURCE, /status: 'rejected'/);
  assertMatch(SOURCE, /status: 401/);
});

Deno.test("CORS: handleCors antes de qualquer parsing/IO", () => {
  const corsIdx = SOURCE.indexOf("handleCors(req)");
  const bodyIdx = SOURCE.indexOf("await req.text()");
  assert(corsIdx > 0 && (bodyIdx === -1 || corsIdx < bodyIdx),
    "handleCors deve ser chamado antes de ler o body");
});

Deno.test("Method guard: somente POST aceito", () => {
  assertMatch(SOURCE, /req\.method !== 'POST'/);
  assertMatch(SOURCE, /status: 405/);
});

Deno.test("Idempotência: dedup por sha256(instance:event:body) + markEventProcessed", () => {
  assertMatch(SOURCE, /sha256Hex\(rawBody\)/);
  assertMatch(SOURCE, /\$\{instance \|\| 'unknown'\}:\$\{event\}:\$\{bodyHash\}/);
  assertMatch(SOURCE, /markEventProcessed\(supabase, eventId/);
  assertMatch(SOURCE, /duplicate: true/);
});

Deno.test("JSON inválido => 400 + audit rejected", () => {
  assertMatch(SOURCE, /error: 'invalid_json'/);
  assertMatch(SOURCE, /status: 400/);
});

Deno.test("Resiliência: handler_error retorna 200 (sem retry-storm)", () => {
  const block = SOURCE.slice(SOURCE.indexOf("} catch (error: unknown)"));
  assertMatch(block, /handler_error/);
  assertMatch(block, /status: 200/);
  assertMatch(block, /error: 'internal_error'/);
});

Deno.test("Auditoria: estados rejected/duplicate/processed/error presentes", () => {
  for (const s of ["'rejected'", "'duplicate'", "'processed'", "'error'"]) {
    assert(hasMarker(SOURCE, `status: ${s}`), `faltou status ${s}`);
  }
});

Deno.test("Roteamento: eventos críticos cobertos", () => {
  const events = [
    "connection.update",
    "messages.upsert",
    "messages.update",
    "messages.delete",
    "send.message",
    "contacts.upsert",
    "presence.update",
    "chats.upsert",
    "labels.edit",
    "labels.association",
    "call",
    "qrcode.updated",
    "logout.instance",
    "application.startup",
  ];
  for (const ev of events) {
    assert(SOURCE.includes(`'${ev}'`), `faltou roteamento para evento ${ev}`);
  }
});

Deno.test("Privacidade: redactJid usado em logs de mensagens", () => {
  assertMatch(SOURCE, /redactJid\(key\.remoteJid\)/);
});

Deno.test("Observabilidade: requestId em todas as respostas", () => {
  assertMatch(SOURCE, /generateRequestId\(\)/);
  assertMatch(SOURCE, /'x-request-id': requestId/);
});
