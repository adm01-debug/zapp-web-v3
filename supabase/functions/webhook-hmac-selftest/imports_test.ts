/**
 * Import smoke test — valida estaticamente que todos os imports do
 * edge function são resolvíveis pelo bundler do Deno (mesmo pipeline
 * usado no deploy do Supabase). Captura erros como:
 *   "Relative import path \"@supabase/supabase-js/cors\" not prefixed..."
 * antes do deploy.
 *
 * Não EXECUTA o módulo (evita Deno.serve criar listener vazado).
 * Usa `deno info --json` para resolver o grafo de dependências.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.208.0/assert/mod.ts';

async function checkImports(entry: string): Promise<{ ok: boolean; error?: string }> {
  const cmd = new Deno.Command('deno', {
    args: ['info', '--json', entry],
    stdout: 'piped',
    stderr: 'piped',
  });
  const { code, stderr } = await cmd.output();
  if (code !== 0) {
    return { ok: false, error: new TextDecoder().decode(stderr) };
  }
  return { ok: true };
}

Deno.test('webhook-hmac-selftest: grafo de imports resolve', async () => {
  const result = await checkImports('./supabase/functions/webhook-hmac-selftest/index.ts');
  assert(result.ok, `Falha ao resolver imports:\n${result.error}`);
});

Deno.test('_shared/hmac-validation: grafo de imports resolve', async () => {
  const result = await checkImports('./supabase/functions/_shared/hmac-validation.ts');
  assert(result.ok, `Falha ao resolver imports:\n${result.error}`);
});

Deno.test('hmac-validation: exporta API esperada', async () => {
  const mod = await import('../_shared/hmac-validation.ts');
  assertEquals(typeof mod.createWebhookValidator, 'function');
  assertEquals(typeof mod.verifyHmacSignature, 'function');
  assertEquals(typeof mod.WebhookSecurityService, 'function');
});
