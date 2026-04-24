/**
 * webhook-hmac-selftest
 *
 * Gera um payload sintético, calcula HMAC-SHA256 com o secret configurado no
 * servidor (EVOLUTION_WEBHOOK_SECRET ou WEBHOOK_SECRET) e valida via o mesmo
 * pipeline usado pelo evolution-webhook (createWebhookValidator).
 *
 * Retorna diagnóstico — sem expor o secret. Útil para confirmar que o secret
 * configurado na borda bate com o assinador remoto.
 */
import { createWebhookValidator } from '../_shared/hmac-validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function computeHmac(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return toHex(sig);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startedAt = Date.now();
  const secret = Deno.env.get('EVOLUTION_WEBHOOK_SECRET')
    ?? Deno.env.get('WEBHOOK_SECRET')
    ?? '';

  if (!secret) {
    return new Response(
      JSON.stringify({
        ok: false,
        configured: false,
        error: 'No webhook secret configured (EVOLUTION_WEBHOOK_SECRET / WEBHOOK_SECRET).',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Optional override of the test payload from the client.
  let body: Record<string, unknown> = {};
  try {
    if (req.method === 'POST') body = await req.json();
  } catch { /* ignore */ }

  const synthetic = {
    event: 'self.test',
    instance: (body?.instance as string) ?? 'selftest',
    nonce: crypto.randomUUID(),
    issuedAt: new Date().toISOString(),
  };
  const payload = JSON.stringify(synthetic);

  // 1) Signature with correct secret
  const goodSig = await computeHmac(payload, secret);

  // 2) Signature with tampered secret (negative control)
  const badSig = await computeHmac(payload, secret + 'X');

  const validate = createWebhookValidator(secret, false);

  const makeReq = (sig: string) =>
    new Request('https://selftest.local/', {
      method: 'POST',
      headers: { 'x-hub-signature-256': `sha256=${sig}`, 'content-type': 'application/json' },
      body: payload,
    });

  const goodResult = await validate(makeReq(goodSig));
  const tamperedResult = await validate(makeReq(badSig));

  const ok = goodResult.valid && !tamperedResult.valid;

  return new Response(
    JSON.stringify({
      ok,
      configured: true,
      secret_length: secret.length,
      duration_ms: Date.now() - startedAt,
      payload_preview: synthetic,
      payload_bytes: payload.length,
      computed_signature_prefix: goodSig.slice(0, 16),
      good: {
        accepted: goodResult.valid,
        signatureFound: goodResult.signatureFound,
        error: goodResult.error ?? null,
      },
      tampered: {
        accepted: tamperedResult.valid,
        signatureFound: tamperedResult.signatureFound,
        error: tamperedResult.error ?? null,
      },
      message: ok
        ? 'HMAC validation working correctly: valid signatures accepted, tampered signatures rejected.'
        : 'HMAC validation FAILED — see good/tampered results.',
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
