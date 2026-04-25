/**
 * Testes da deduplicação do toast "Conexão instável" por
 * `contato + tipo de erro` durante o ciclo de retries.
 *
 * Cobertura:
 *   1. Normalização de erro: mensagens diferentes mapeiam para o mesmo código.
 *   2. Chave combina contactId + errorCode normalizado.
 *   3. Múltiplos retries do MESMO (contato, tipoErro) → só 1 toast.
 *   4. Retries com tipos de erro DIFERENTES no mesmo contato → toasts distintos.
 *   5. Retries do MESMO tipo em contatos DIFERENTES → toasts distintos.
 *   6. Cooldown configurável libera após expirar.
 *   7. `releaseInstabilityToastDedupe` libera por contato (ex.: conexão OK).
 *   8. Telemetria: contadores fired/suppressed refletem o ciclo.
 *   9. Cooldown padrão (60s) suprime durante backoff inteiro de retries seguidos.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldShowInstabilityToast,
  buildInstabilityToastKey,
  normalizeErrorCode,
  releaseInstabilityToastDedupe,
  getInstabilityToastFiredCount,
  getInstabilityToastSuppressedCount,
  getInstabilityToastCooldownSize,
  __resetInstabilityToastDedupeForTest,
  INSTABILITY_TOAST_COOLDOWN_MS,
  INSTABILITY_TOAST_MAX_KEYS,
} from '@/lib/instabilityToastDedupe';

beforeEach(() => {
  __resetInstabilityToastDedupeForTest();
});

describe('normalizeErrorCode — mapeia mensagens variáveis para códigos estáveis', () => {
  it('classifica HTTP 401/403 como AUTH', () => {
    expect(normalizeErrorCode({ status: 401, message: 'Unauthorized at 10:00' })).toBe('AUTH');
    expect(normalizeErrorCode({ status: 403, message: 'forbidden xyz' })).toBe('AUTH');
  });

  it('classifica HTTP 5xx como SERVER', () => {
    expect(normalizeErrorCode({ status: 500 })).toBe('SERVER');
    expect(normalizeErrorCode({ status: 502, message: 'bad gateway' })).toBe('SERVER');
  });

  it('classifica HTTP 408/504 como TIMEOUT e 429 como RATE_LIMIT', () => {
    expect(normalizeErrorCode({ status: 408 })).toBe('TIMEOUT');
    expect(normalizeErrorCode({ status: 504 })).toBe('TIMEOUT');
    expect(normalizeErrorCode({ status: 429 })).toBe('RATE_LIMIT');
  });

  it('mensagens "timeout" diferentes → mesmo código TIMEOUT', () => {
    expect(normalizeErrorCode(new Error('Request timeout after 5000ms'))).toBe('TIMEOUT');
    expect(normalizeErrorCode(new Error('connection timed out'))).toBe('TIMEOUT');
    expect(normalizeErrorCode('Operation TIMEOUT'.toString())).toBe('TIMEOUT');
  });

  it('mensagens de rede variáveis → NETWORK', () => {
    expect(normalizeErrorCode(new Error('fetch failed'))).toBe('NETWORK');
    expect(normalizeErrorCode(new Error('ECONNRESET on socket'))).toBe('NETWORK');
    expect(normalizeErrorCode(new Error('network unreachable'))).toBe('NETWORK');
  });

  it('respeita err.code explícito quando presente', () => {
    expect(normalizeErrorCode({ code: 'evo_send_failed' })).toBe('EVO_SEND_FAILED');
    expect(normalizeErrorCode({ code: 42 })).toBe('CODE_42');
  });

  it('fallback UNKNOWN para erros sem sinal reconhecível', () => {
    expect(normalizeErrorCode(null)).toBe('UNKNOWN');
    expect(normalizeErrorCode({})).toBe('UNKNOWN');
    expect(normalizeErrorCode(new Error('???'))).toBe('UNKNOWN');
  });
});

describe('buildInstabilityToastKey — chave contato+tipoErro', () => {
  it('combina contactId com errorCode normalizado', () => {
    expect(buildInstabilityToastKey('c1', { status: 500 })).toBe('c1|SERVER');
    expect(buildInstabilityToastKey('c1', new Error('timeout x'))).toBe('c1|TIMEOUT');
  });

  it('mensagens diferentes do mesmo tipo geram a MESMA chave', () => {
    const k1 = buildInstabilityToastKey('c1', new Error('Request timeout'));
    const k2 = buildInstabilityToastKey('c1', new Error('socket timed out at 12:34:56'));
    expect(k1).toBe(k2);
  });

  it('contatos diferentes ou tipos diferentes → chaves distintas', () => {
    const a = buildInstabilityToastKey('c1', { status: 500 });
    const b = buildInstabilityToastKey('c2', { status: 500 });
    const c = buildInstabilityToastKey('c1', { status: 401 });
    expect(new Set([a, b, c]).size).toBe(3);
  });
});

describe('shouldShowInstabilityToast — dedupe durante ciclo de retries', () => {
  it('múltiplos retries do mesmo (contato, tipoErro) → 1 toast só', () => {
    const err = new Error('fetch failed');
    const t0 = 1_000_000;
    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 })).toBe(true); // attempt 1
    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 + 500 })).toBe(false); // attempt 2 (backoff)
    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 + 2_000 })).toBe(false); // attempt 3
    expect(getInstabilityToastFiredCount('c1|NETWORK')).toBe(1);
    expect(getInstabilityToastSuppressedCount('c1|NETWORK')).toBe(2);
  });

  it('mensagens de exceção VARIÁVEIS, mesmo tipo → ainda deduplica', () => {
    const t0 = 1_000_000;
    expect(shouldShowInstabilityToast('c1', new Error('timeout @ 1'), { nowMs: t0 })).toBe(true);
    expect(shouldShowInstabilityToast('c1', new Error('timed out @ 2'), { nowMs: t0 + 1_000 })).toBe(false);
    expect(shouldShowInstabilityToast('c1', new Error('Request timeout x'), { nowMs: t0 + 2_000 })).toBe(false);
    expect(getInstabilityToastFiredCount('c1|TIMEOUT')).toBe(1);
    expect(getInstabilityToastSuppressedCount('c1|TIMEOUT')).toBe(2);
  });

  it('tipos de erro DIFERENTES no mesmo contato → toasts distintos', () => {
    const t0 = 1_000_000;
    expect(shouldShowInstabilityToast('c1', { status: 500 }, { nowMs: t0 })).toBe(true);
    expect(shouldShowInstabilityToast('c1', { status: 401 }, { nowMs: t0 + 100 })).toBe(true);
    expect(shouldShowInstabilityToast('c1', new Error('timeout'), { nowMs: t0 + 200 })).toBe(true);
    expect(getInstabilityToastFiredCount('c1|SERVER')).toBe(1);
    expect(getInstabilityToastFiredCount('c1|AUTH')).toBe(1);
    expect(getInstabilityToastFiredCount('c1|TIMEOUT')).toBe(1);
  });

  it('mesmo tipo em contatos DIFERENTES → toasts distintos', () => {
    const err = { status: 500 };
    const t0 = 1_000_000;
    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 })).toBe(true);
    expect(shouldShowInstabilityToast('c2', err, { nowMs: t0 })).toBe(true);
    expect(shouldShowInstabilityToast('c3', err, { nowMs: t0 })).toBe(true);
    // Repetições suprimidas por contato
    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 + 1_000 })).toBe(false);
    expect(getInstabilityToastFiredCount('c1|SERVER')).toBe(1);
    expect(getInstabilityToastFiredCount('c2|SERVER')).toBe(1);
    expect(getInstabilityToastFiredCount('c3|SERVER')).toBe(1);
  });

  it('cooldown padrão (60s) suprime ciclo inteiro de retries em backoff', () => {
    const err = new Error('fetch failed');
    let now = 1_000_000;
    expect(shouldShowInstabilityToast('c1', err, { nowMs: now })).toBe(true);
    // 5 retries com backoff exponencial dentro de 60s
    for (const delta of [500, 1_500, 3_500, 7_500, 15_500]) {
      now = 1_000_000 + delta;
      expect(shouldShowInstabilityToast('c1', err, { nowMs: now })).toBe(false);
    }
    expect(getInstabilityToastSuppressedCount('c1|NETWORK')).toBe(5);
  });

  it('libera após expirar o cooldown configurável', () => {
    const err = { status: 500 };
    const t0 = 1_000_000;
    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0, cooldownMs: 1_000 })).toBe(true);
    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 + 500, cooldownMs: 1_000 })).toBe(false);
    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 + 1_001, cooldownMs: 1_000 })).toBe(true);
    expect(getInstabilityToastFiredCount('c1|SERVER')).toBe(2);
  });

  it('libera após o cooldown padrão de 60s', () => {
    const err = new Error('timeout');
    const t0 = 1_000_000;
    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 })).toBe(true);
    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 + INSTABILITY_TOAST_COOLDOWN_MS - 1 })).toBe(false);
    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 + INSTABILITY_TOAST_COOLDOWN_MS + 1 })).toBe(true);
  });
});

describe('releaseInstabilityToastDedupe — liberação manual', () => {
  it('libera apenas o contato informado (ex.: conexão bem-sucedida)', () => {
    const err = { status: 500 };
    const t0 = 1_000_000;
    shouldShowInstabilityToast('c1', err, { nowMs: t0 });
    shouldShowInstabilityToast('c2', err, { nowMs: t0 });
    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 + 100 })).toBe(false);
    expect(shouldShowInstabilityToast('c2', err, { nowMs: t0 + 100 })).toBe(false);

    releaseInstabilityToastDedupe('c1');

    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 + 200 })).toBe(true);
    // c2 segue dentro do cooldown
    expect(shouldShowInstabilityToast('c2', err, { nowMs: t0 + 200 })).toBe(false);
  });

  it('sem argumento limpa todos os contatos', () => {
    const err = { status: 500 };
    const t0 = 1_000_000;
    shouldShowInstabilityToast('c1', err, { nowMs: t0 });
    shouldShowInstabilityToast('c2', err, { nowMs: t0 });

    releaseInstabilityToastDedupe();

    expect(shouldShowInstabilityToast('c1', err, { nowMs: t0 + 1 })).toBe(true);
    expect(shouldShowInstabilityToast('c2', err, { nowMs: t0 + 1 })).toBe(true);
  });

  it('libera só a chave do contato — não afeta tipos de erro DIFERENTES de outros contatos', () => {
    const t0 = 1_000_000;
    shouldShowInstabilityToast('c1', { status: 500 }, { nowMs: t0 });
    shouldShowInstabilityToast('c1', { status: 401 }, { nowMs: t0 });
    shouldShowInstabilityToast('c2', { status: 500 }, { nowMs: t0 });

    releaseInstabilityToastDedupe('c1');

    // c1 liberado para AMBOS os tipos
    expect(shouldShowInstabilityToast('c1', { status: 500 }, { nowMs: t0 + 1 })).toBe(true);
    expect(shouldShowInstabilityToast('c1', { status: 401 }, { nowMs: t0 + 1 })).toBe(true);
    // c2 inalterado
    expect(shouldShowInstabilityToast('c2', { status: 500 }, { nowMs: t0 + 1 })).toBe(false);
});

describe('eviction LRU — limpa o Map quando excede INSTABILITY_TOAST_MAX_KEYS', () => {
  it('expõe o limite default de 200 chaves', () => {
    expect(INSTABILITY_TOAST_MAX_KEYS).toBe(200);
  });

  it('mantém o tamanho do Map ≤ MAX após muitos contatos distintos', () => {
    const err = { status: 500 };
    const total = INSTABILITY_TOAST_MAX_KEYS + 50;
    for (let i = 0; i < total; i++) {
      shouldShowInstabilityToast(`c${i}`, err, { nowMs: 1_000_000 + i });
    }
    expect(getInstabilityToastCooldownSize()).toBe(INSTABILITY_TOAST_MAX_KEYS);
  });

  it('remove as chaves MAIS ANTIGAS primeiro (LRU por lastFired)', () => {
    const err = { status: 500 };
    // Preenche até o limite
    for (let i = 0; i < INSTABILITY_TOAST_MAX_KEYS; i++) {
      shouldShowInstabilityToast(`c${i}`, err, { nowMs: 1_000_000 + i });
    }
    expect(getInstabilityToastCooldownSize()).toBe(INSTABILITY_TOAST_MAX_KEYS);

    // Adiciona 3 novas → as 3 mais antigas (c0, c1, c2) devem sair
    shouldShowInstabilityToast('newA', err, { nowMs: 9_000_000 });
    shouldShowInstabilityToast('newB', err, { nowMs: 9_000_001 });
    shouldShowInstabilityToast('newC', err, { nowMs: 9_000_002 });

    expect(getInstabilityToastCooldownSize()).toBe(INSTABILITY_TOAST_MAX_KEYS);

    // c0, c1, c2 foram despejados → próximo show deve disparar (true) imediatamente
    expect(shouldShowInstabilityToast('c0', err, { nowMs: 9_000_100 })).toBe(true);
    expect(shouldShowInstabilityToast('c1', err, { nowMs: 9_000_100 })).toBe(true);
    expect(shouldShowInstabilityToast('c2', err, { nowMs: 9_000_100 })).toBe(true);

    // Uma chave recente (c199) ainda está no cooldown → suprime
    expect(
      shouldShowInstabilityToast(`c${INSTABILITY_TOAST_MAX_KEYS - 1}`, err, { nowMs: 9_000_100 }),
    ).toBe(false);
  });

  it('preserva contadores de telemetria mesmo após eviction', () => {
    const err = { status: 500 };
    // c_old é o primeiro (mais antigo)
    shouldShowInstabilityToast('c_old', err, { nowMs: 1 });
    expect(getInstabilityToastFiredCount('c_old|SERVER')).toBe(1);

    // Empurra além do limite para forçar eviction de c_old
    for (let i = 0; i < INSTABILITY_TOAST_MAX_KEYS + 5; i++) {
      shouldShowInstabilityToast(`c${i}`, err, { nowMs: 1_000_000 + i });
    }

    // Telemetria de c_old continua intacta
    expect(getInstabilityToastFiredCount('c_old|SERVER')).toBe(1);
    expect(getInstabilityToastCooldownSize()).toBe(INSTABILITY_TOAST_MAX_KEYS);
  });
});
});
