// Testes Deno para os predicados puros do enqueue-failed-message.
// Não exercita o insert real (depende de service-role + rede).
//
// Rodar: deno test supabase/functions/_shared/__tests__/enqueue-failed-message.test.ts

import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

// Re-implementação local dos predicados (mesma lógica do helper).
// Mantida em sync manualmente — qualquer mudança no helper deve refletir aqui.
const PERMANENT_STATUSES = new Set([400, 401, 403, 404, 422]);

function isTransientFailure(input: {
  http_status?: number | null;
  error_code?: string | null;
}): boolean {
  if (input.http_status == null) {
    return input.error_code === 'timeout' || input.error_code === 'network_error';
  }
  if (PERMANENT_STATUSES.has(input.http_status)) return false;
  if (input.http_status === 429) return true;
  if (input.http_status >= 500 && input.http_status < 600) return true;
  return false;
}

function isSendPath(path: string): boolean {
  return path.startsWith('/message/') || path.includes('/message/');
}

Deno.test('isTransientFailure: 200 → false', () => {
  assertEquals(isTransientFailure({ http_status: 200 }), false);
});

Deno.test('isTransientFailure: 429 → true', () => {
  assertEquals(isTransientFailure({ http_status: 429 }), true);
});

Deno.test('isTransientFailure: 502/503/504 → true', () => {
  assertEquals(isTransientFailure({ http_status: 502 }), true);
  assertEquals(isTransientFailure({ http_status: 503 }), true);
  assertEquals(isTransientFailure({ http_status: 504 }), true);
});

Deno.test('isTransientFailure: 400/401/403/404/422 → false (permanente)', () => {
  assertEquals(isTransientFailure({ http_status: 400 }), false);
  assertEquals(isTransientFailure({ http_status: 401 }), false);
  assertEquals(isTransientFailure({ http_status: 403 }), false);
  assertEquals(isTransientFailure({ http_status: 404 }), false);
  assertEquals(isTransientFailure({ http_status: 422 }), false);
});

Deno.test('isTransientFailure: timeout sem status → true', () => {
  assertEquals(isTransientFailure({ error_code: 'timeout' }), true);
});

Deno.test('isTransientFailure: network_error sem status → true', () => {
  assertEquals(isTransientFailure({ error_code: 'network_error' }), true);
});

Deno.test('isTransientFailure: undefined sem código → false', () => {
  assertEquals(isTransientFailure({}), false);
});

Deno.test('isSendPath: /message/sendText → true', () => {
  assertEquals(isSendPath('/message/sendText'), true);
});

Deno.test('isSendPath: /message/sendMedia → true', () => {
  assertEquals(isSendPath('/message/sendMedia'), true);
});

Deno.test('isSendPath: /instance/connect → false', () => {
  assertEquals(isSendPath('/instance/connect'), false);
});

Deno.test('isSendPath: caminho aninhado /api/wpp2/message/sendText → true', () => {
  assertEquals(isSendPath('/api/wpp2/message/sendText'), true);
});
