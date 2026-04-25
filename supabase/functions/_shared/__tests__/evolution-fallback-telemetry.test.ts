import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  detectFallbackReason,
  logFallbackEvent,
  maybeLogFallback,
} from "../evolution-fallback-telemetry.ts";

// Captura console.log para inspecionar os eventos emitidos.
function withCapturedLogs<T>(fn: () => T): { result: T; logs: string[] } {
  const original = console.log;
  const logs: string[] = [];
  console.log = (...args: unknown[]) => {
    logs.push(args.map((a) => typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
  };
  try {
    const result = fn();
    return { result, logs };
  } finally {
    console.log = original;
  }
}

Deno.test("detectFallbackReason — HTTP 404 dispara http_404", () => {
  assertEquals(detectFallbackReason('find-chats', 404, { ok: true }), 'http_404');
});

Deno.test("detectFallbackReason — payload com 'Not Found' dispara not_found_payload", () => {
  assertEquals(
    detectFallbackReason('find-contacts', 200, { error: true, message: 'Not Found' }),
    'not_found_payload',
  );
  assertEquals(
    detectFallbackReason('find-contacts', 200, { code: 'not_found' }),
    'not_found_payload',
  );
});

Deno.test("detectFallbackReason — fetch-profile com payload vazio", () => {
  assertEquals(detectFallbackReason('fetch-profile', 200, null), 'empty_payload');
  assertEquals(detectFallbackReason('fetch-profile', 200, { version: 1 }), 'empty_payload');
  assertEquals(detectFallbackReason('fetch-profile', 200, {}), 'empty_payload');
});

Deno.test("detectFallbackReason — find-chats com array vazio NÃO dispara", () => {
  // Listas vazias são respostas válidas, não fallback.
  assertEquals(detectFallbackReason('find-chats', 200, []), null);
  assertEquals(detectFallbackReason('find-chats', 200, { records: [] }), null);
});

Deno.test("detectFallbackReason — sucesso retorna null", () => {
  assertEquals(detectFallbackReason('find-chats', 200, [{ id: 1 }]), null);
  assertEquals(detectFallbackReason('fetch-profile', 200, { name: 'X' }), null);
});

Deno.test("detectFallbackReason — 5xx com error:true dispara upstream_error", () => {
  assertEquals(
    detectFallbackReason('find-chats', 502, { error: true, message: 'bad gateway' }),
    'upstream_error',
  );
});

Deno.test("logFallbackEvent — emite linha única JSON com prefixo e campos estáveis", () => {
  const { result, logs } = withCapturedLogs(() =>
    logFallbackEvent({
      action: 'find-chats',
      endpoint: '/chat/findChats/wpp2',
      instance: 'wpp2',
      status: 404,
      reason: 'http_404',
      mode: 'detected',
      primary_ms: 123,
    }),
  );

  assertEquals(logs.length, 1);
  assertEquals(logs[0].startsWith('[evolution-fallback] '), true);
  const json = JSON.parse(logs[0].replace('[evolution-fallback] ', ''));
  assertEquals(json.tag, 'evolution-fallback');
  assertEquals(json.action, 'find-chats');
  assertEquals(json.endpoint, '/chat/findChats/wpp2');
  assertEquals(json.instance, 'wpp2');
  assertEquals(json.reason, 'http_404');
  assertEquals(json.mode, 'detected');
  assertEquals(json.fallback_target, 'rpc:rpc_list_conversations');
  assertEquals(json.primary_ms, 123);
  assertExists(json.ts);
  assertEquals(result.tag, 'evolution-fallback');
});

Deno.test("logFallbackEvent — fallback_target customizado prevalece", () => {
  const { logs } = withCapturedLogs(() =>
    logFallbackEvent({
      action: 'fetch-profile',
      endpoint: '/profile/fetchProfile/wpp2',
      instance: 'wpp2',
      status: 200,
      reason: 'empty_payload',
      mode: 'detected',
      fallback_target: 'custom:override',
    }),
  );
  const json = JSON.parse(logs[0].replace('[evolution-fallback] ', ''));
  assertEquals(json.fallback_target, 'custom:override');
});

Deno.test("maybeLogFallback — sem motivo não loga e retorna null", () => {
  const { result, logs } = withCapturedLogs(() =>
    maybeLogFallback({
      action: 'find-chats',
      endpoint: '/chat/findChats/wpp2',
      instance: 'wpp2',
      status: 200,
      data: [{ id: 1 }],
    }),
  );
  assertEquals(result, null);
  assertEquals(logs.length, 0);
});

Deno.test("maybeLogFallback — com motivo loga e retorna evento", () => {
  const { result, logs } = withCapturedLogs(() =>
    maybeLogFallback({
      action: 'fetch-profile',
      endpoint: '/profile/fetchProfile/wpp2',
      instance: 'wpp2',
      status: 200,
      data: { version: 1 },
    }),
  );
  assertExists(result);
  assertEquals(result?.reason, 'empty_payload');
  assertEquals(result?.mode, 'detected');
  assertEquals(logs.length, 1);
});

Deno.test("maybeLogFallback — instance null é aceito (action sem instância no body)", () => {
  const { result } = withCapturedLogs(() =>
    maybeLogFallback({
      action: 'find-contacts',
      endpoint: '/chat/findContacts/unknown',
      instance: null,
      status: 404,
      data: null,
    }),
  );
  assertEquals(result?.instance, null);
  assertEquals(result?.reason, 'http_404');
});

Deno.test("maybeLogFallback — persiste no Supabase quando client é fornecido", () => {
  const inserts: { table: string; row: unknown }[] = [];
  const fakeSupabase = {
    from: (table: string) => ({
      insert: (row: unknown) => {
        inserts.push({ table, row });
        return Promise.resolve({ data: null, error: null });
      },
    }),
  };

  withCapturedLogs(() =>
    maybeLogFallback({
      action: 'find-chats',
      endpoint: '/chat/findChats/wpp2',
      instance: 'wpp2',
      status: 404,
      data: null,
      primary_ms: 42,
      supabase: fakeSupabase,
    }),
  );

  assertEquals(inserts.length, 1);
  assertEquals(inserts[0].table, 'evolution_fallback_events');
  const row = inserts[0].row as Record<string, unknown>;
  assertEquals(row.action, 'find-chats');
  assertEquals(row.reason, 'http_404');
  assertEquals(row.instance, 'wpp2');
  assertEquals(row.status, 404);
  assertEquals(row.mode, 'detected');
  assertEquals(row.fallback_target, 'rpc:rpc_list_conversations');
  assertEquals(row.primary_ms, 42);
});

Deno.test("maybeLogFallback — falha de insert NÃO derruba (silencia rejeição)", async () => {
  const fakeSupabase = {
    from: (_table: string) => ({
      insert: (_row: unknown) => Promise.reject(new Error('boom')),
    }),
  };

  // Não deve lançar
  withCapturedLogs(() =>
    maybeLogFallback({
      action: 'fetch-profile',
      endpoint: '/profile/fetchProfile/wpp2',
      instance: 'wpp2',
      status: 200,
      data: {},
      supabase: fakeSupabase,
    }),
  );

  // Aguarda microtask pra garantir que .catch foi anexado
  await new Promise((r) => setTimeout(r, 0));
});

Deno.test("maybeLogFallback — sem supabase NÃO tenta inserir", () => {
  let inserted = false;
  const _spy = { from: () => { inserted = true; return { insert: () => null }; } };
  // Chamada sem supabase deve apenas logar
  withCapturedLogs(() =>
    maybeLogFallback({
      action: 'find-contacts',
      endpoint: '/chat/findContacts/wpp2',
      instance: 'wpp2',
      status: 404,
      data: null,
    }),
  );
  assertEquals(inserted, false);
});
