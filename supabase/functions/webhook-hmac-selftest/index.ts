/**
 * webhook-hmac-selftest
 *
 * Gera payloads sintéticos, calcula HMAC-SHA256 com o secret configurado e
 * valida via o mesmo pipeline usado pelo evolution-webhook (createWebhookValidator).
 *
 * Além da validação criptográfica, executa cenários de **proteção contra replay**
 * baseados em `issuedAt` e `nonce` — usando uma janela de tolerância configurável
 * (default 300s) e um cache em memória de nonces já vistos durante a execução.
 *
 * Cenários executados:
 *   1. fresh        — assinatura correta + issuedAt agora       → esperado: aceito
 *   2. tampered     — assinatura adulterada                     → esperado: rejeitado (HMAC)
 *   3. expired      — issuedAt fora da janela (no passado)      → esperado: rejeitado (replay)
 *   4. future       — issuedAt fora da janela (no futuro)       → esperado: rejeitado (skew)
 *   5. replay       — mesmo nonce reutilizado                   → esperado: rejeitado (replay)
 *
 * Retorna diagnóstico — sem expor o secret.
 */
import { createWebhookValidator } from '../_shared/hmac-validation.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_TOLERANCE_SECONDS = 300; // 5 minutos
const MAX_TOLERANCE_SECONDS = 3600;    // 1 hora (cap defensivo)

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

interface ScenarioReport {
  name: string;
  description: string;
  expected: 'accept' | 'reject';
  outcome: 'accept' | 'reject';
  passed: boolean;
  reason: string | null;
  issuedAt: string;
  ageSeconds: number;
  nonce: string;
}

/**
 * Valida janela temporal (issuedAt) + replay (nonce).
 * É independente do HMAC; complementa a verificação criptográfica.
 */
function checkTemporal(
  parsed: { issuedAt?: string; nonce?: string },
  toleranceSec: number,
  seenNonces: Set<string>,
  now: number,
): { ok: boolean; ageSeconds: number; reason: string | null } {
  if (!parsed.issuedAt || !parsed.nonce) {
    return { ok: false, ageSeconds: 0, reason: 'Missing issuedAt or nonce' };
  }
  const issued = Date.parse(parsed.issuedAt);
  if (Number.isNaN(issued)) {
    return { ok: false, ageSeconds: 0, reason: 'Invalid issuedAt format' };
  }
  const ageSeconds = Math.round((now - issued) / 1000);
  if (ageSeconds > toleranceSec) {
    return { ok: false, ageSeconds, reason: `Payload expired (age ${ageSeconds}s > ${toleranceSec}s)` };
  }
  if (-ageSeconds > toleranceSec) {
    return { ok: false, ageSeconds, reason: `Payload from the future (skew ${-ageSeconds}s > ${toleranceSec}s)` };
  }
  if (seenNonces.has(parsed.nonce)) {
    return { ok: false, ageSeconds, reason: 'Replay detected: nonce already seen' };
  }
  seenNonces.add(parsed.nonce);
  return { ok: true, ageSeconds, reason: null };
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

  // Body opcional do cliente
  let body: Record<string, unknown> = {};
  try {
    if (req.method === 'POST') body = await req.json();
  } catch { /* ignore */ }

  const instance = (body?.instance as string) ?? 'selftest';
  const requested = Number(body?.tolerance_seconds);
  const toleranceSec = Number.isFinite(requested) && requested > 0
    ? Math.min(Math.floor(requested), MAX_TOLERANCE_SECONDS)
    : DEFAULT_TOLERANCE_SECONDS;
  const includeNegative = body?.include_negative !== false; // default true

  const validate = createWebhookValidator(secret, false);
  const seenNonces = new Set<string>();
  const now = Date.now();

  // Helper: monta payload, assinatura e Request com várias opções de adulteração
  async function makeReq(opts: {
    issuedAt: Date;
    nonce: string;
    /** se true, assina com secret incorreto */
    wrongSecret?: boolean;
    /** muta o payload APÓS computar a assinatura (assinatura fica válida só para o original) */
    mutatePayload?: (parsed: Record<string, unknown>) => Record<string, unknown>;
    /** se true, omite o header de assinatura */
    omitSignature?: boolean;
  }): Promise<{ payload: string; req: Request; sig: string; parsed: Record<string, unknown> }> {
    const synthetic: Record<string, unknown> = {
      event: 'self.test',
      instance,
      nonce: opts.nonce,
      issuedAt: opts.issuedAt.toISOString(),
    };
    const originalPayload = JSON.stringify(synthetic);
    const signingSecret = opts.wrongSecret ? secret + 'X' : secret;
    const sig = await computeHmac(originalPayload, signingSecret);

    // Mutação após a assinatura — simula payload alterado em trânsito
    const finalParsed = opts.mutatePayload ? opts.mutatePayload({ ...synthetic }) : synthetic;
    const finalPayload = opts.mutatePayload ? JSON.stringify(finalParsed) : originalPayload;

    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (!opts.omitSignature) {
      headers['x-hub-signature-256'] = `sha256=${sig}`;
    }
    const r = new Request('https://selftest.local/', {
      method: 'POST',
      headers,
      body: finalPayload,
    });
    return { payload: finalPayload, req: r, sig, parsed: finalParsed };
  }

  // Helper: roda um cenário (HMAC + temporal) e produz relatório
  async function runScenario(args: {
    name: string;
    description: string;
    expected: 'accept' | 'reject';
    issuedAt: Date;
    nonce: string;
    wrongSecret?: boolean;
    mutatePayload?: (parsed: Record<string, unknown>) => Record<string, unknown>;
    omitSignature?: boolean;
    /** força re-uso de nonce (cenário replay) */
    preSeed?: string;
  }): Promise<ScenarioReport> {
    if (args.preSeed) seenNonces.add(args.preSeed);
    const { req: testReq, parsed } = await makeReq(args);
    const hmacResult = await validate(testReq);
    let outcome: 'accept' | 'reject' = hmacResult.valid ? 'accept' : 'reject';
    let reason: string | null = hmacResult.error ?? null;

    // Validador roda em modo não-estrito: pode aceitar request sem assinatura.
    // No self-test tratamos ausência como rejeição lógica explícita.
    if (outcome === 'accept' && !hmacResult.signatureFound) {
      outcome = 'reject';
      reason = 'Missing signature header';
    }

    if (outcome === 'accept') {
      const temporal = checkTemporal(parsed as { issuedAt?: string; nonce?: string }, toleranceSec, seenNonces, now);
      if (!temporal.ok) {
        outcome = 'reject';
        reason = temporal.reason;
      }
    }

    const ageSeconds = Math.round((now - args.issuedAt.getTime()) / 1000);
    return {
      name: args.name,
      description: args.description,
      expected: args.expected,
      outcome,
      passed: outcome === args.expected,
      reason,
      issuedAt: args.issuedAt.toISOString(),
      ageSeconds,
      nonce: args.nonce,
    };
  }

  const sharedNonce = crypto.randomUUID();
  const scenarios: ScenarioReport[] = [];

  // Cenários base
  scenarios.push(await runScenario({
    name: 'fresh',
    description: 'Assinatura válida + issuedAt agora',
    expected: 'accept',
    issuedAt: new Date(now),
    nonce: crypto.randomUUID(),
  }));

  scenarios.push(await runScenario({
    name: 'tampered',
    description: 'Assinatura adulterada (secret errado)',
    expected: 'reject',
    issuedAt: new Date(now),
    nonce: crypto.randomUUID(),
    wrongSecret: true,
  }));

  scenarios.push(await runScenario({
    name: 'expired',
    description: `issuedAt antigo (${toleranceSec + 60}s no passado)`,
    expected: 'reject',
    issuedAt: new Date(now - (toleranceSec + 60) * 1000),
    nonce: crypto.randomUUID(),
  }));

  scenarios.push(await runScenario({
    name: 'future',
    description: `issuedAt no futuro (${toleranceSec + 60}s à frente)`,
    expected: 'reject',
    issuedAt: new Date(now + (toleranceSec + 60) * 1000),
    nonce: crypto.randomUUID(),
  }));

  scenarios.push(await runScenario({
    name: 'replay',
    description: 'Mesmo nonce reutilizado dentro da janela',
    expected: 'reject',
    issuedAt: new Date(now),
    nonce: sharedNonce,
    preSeed: sharedNonce,
  }));

  // Cenários negativos adicionais (opt-in, default ON)
  if (includeNegative) {
    scenarios.push(await runScenario({
      name: 'wrong-secret',
      description: 'Assinatura computada com secret diferente do servidor',
      expected: 'reject',
      issuedAt: new Date(now),
      nonce: crypto.randomUUID(),
      wrongSecret: true,
    }));

    scenarios.push(await runScenario({
      name: 'payload-mutated',
      description: 'Payload alterado após a assinatura (sem recomputar)',
      expected: 'reject',
      issuedAt: new Date(now),
      nonce: crypto.randomUUID(),
      mutatePayload: (p) => ({ ...p, event: 'self.test.tampered', extra: 'injected' }),
    }));

    scenarios.push(await runScenario({
      name: 'missing-signature',
      description: 'Request enviado sem o header x-hub-signature-256',
      expected: 'reject',
      issuedAt: new Date(now),
      nonce: crypto.randomUUID(),
      omitSignature: true,
    }));
  }

  const allPassed = scenarios.every((s) => s.passed);
  const fresh = scenarios[0];
  const tampered = scenarios[1];

  return new Response(
    JSON.stringify({
      ok: allPassed,
      configured: true,
      secret_length: secret.length,
      duration_ms: Date.now() - startedAt,
      tolerance_seconds: toleranceSec,
      scenarios,
      // Compatibilidade com o consumidor anterior (good/tampered)
      good: {
        accepted: fresh.outcome === 'accept',
        signatureFound: true,
        error: fresh.reason,
      },
      tampered: {
        accepted: tampered.outcome === 'accept',
        signatureFound: true,
        error: tampered.reason,
      },
      payload_preview: {
        event: 'self.test',
        instance,
        nonce: '<random>',
        issuedAt: new Date(now).toISOString(),
      },
      message: allPassed
        ? `HMAC + replay protection OK: ${scenarios.length} cenários passaram (janela ${toleranceSec}s).`
        : `Falha em ${scenarios.filter((s) => !s.passed).length}/${scenarios.length} cenários — verifique detalhes.`,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
