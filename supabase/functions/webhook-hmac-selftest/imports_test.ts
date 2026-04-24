/**
 * Import smoke test — garante que o edge function compila/resolve todos
 * os imports antes do deploy. Falha se houver path inválido ou módulo
 * não resolvível (ex.: "@supabase/supabase-js/cors" sem prefixo npm:).
 *
 * Rode com:
 *   deno test --allow-net --allow-env supabase/functions/webhook-hmac-selftest/imports_test.ts
 *
 * Ou via tool: supabase--test_edge_functions { functions: ["webhook-hmac-selftest"] }
 */
import { assert } from 'https://deno.land/std@0.208.0/assert/mod.ts';

Deno.test('webhook-hmac-selftest: imports resolvem sem erro', async () => {
  const mod = await import('./index.ts');
  assert(mod, 'módulo carregou');
});

Deno.test('hmac-validation shared: imports resolvem sem erro', async () => {
  const mod = await import('../_shared/hmac-validation.ts');
  assert(typeof mod.createWebhookValidator === 'function');
  assert(typeof mod.verifyHmacSignature === 'function');
});
