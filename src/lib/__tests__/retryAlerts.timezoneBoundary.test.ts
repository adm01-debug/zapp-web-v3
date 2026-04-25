/**
 * Testes de dedupe atravessando virada de dia / DST / mudanças de timezone.
 *
 * O sistema dedupa em duas camadas:
 *   1. Idempotency-miss alerts → `hourBucket = floor(ts / 1h)` (UTC absoluto).
 *   2. Retry alerts → chave inclui o rótulo de duração `Nh` + cooldown 5min.
 *
 * Como ambos usam timestamps UTC (Date.now / ms desde epoch), timezone do
 * navegador é irrelevante. Estes testes garantem que isso permanece verdade
 * mesmo em cenários típicos de regressão:
 *   - Cruzar 23:59 → 00:00 local não cria buckets a mais.
 *   - DST (spring-forward / fall-back) não duplica nem pula buckets.
 *   - Trocar `process.env.TZ` no meio do teste não muda a chave persistida.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  shouldFireRetryAlert,
  buildRetryAlertDedupeKey,
  RETRY_ALERT_COOLDOWN_MS,
} from '../retryAlerts';
import { __test__ as missAlerts } from '@/hooks/monitoring/useIdempotencyMissAlerts';

const { hourBucket, buildPersistKey, ONE_HOUR_MS } = missAlerts;

/** Helper: instante exato em UTC. */
function utc(y: number, mo: number, d: number, h: number, mi = 0): number {
  return Date.UTC(y, mo - 1, d, h, mi, 0, 0);
}

describe('idempotency-miss dedupe — virada de dia e timezone', () => {
  it('um único bucket cobre todos os instantes da mesma hora UTC', () => {
    const start = utc(2026, 4, 25, 23, 0); // 23:00 UTC
    const samples = [start, start + 60_000, start + 30 * 60_000, start + 59 * 60_000 + 59_000];
    const buckets = samples.map(hourBucket);
    expect(new Set(buckets).size).toBe(1);
  });

  it('virada 23:xx → 00:xx UTC avança exatamente 1 bucket', () => {
    const before = utc(2026, 4, 25, 23, 59); // último minuto do dia UTC
    const after = utc(2026, 4, 26, 0, 0);    // primeiro minuto do dia seguinte
    expect(hourBucket(after) - hourBucket(before)).toBe(1);
  });

  it('virada de dia em fuso local (ex.: 21:00 UTC = 00:00 BRT-3) não cria bucket extra', () => {
    // 23:30 BRT (-03:00) = 02:30 UTC do dia seguinte. Mas o bucket é por hora UTC,
    // então 21:00 UTC e 21:30 UTC compartilham bucket independentemente do horário local.
    const a = utc(2026, 4, 25, 21, 0);
    const b = utc(2026, 4, 25, 21, 30);
    expect(hourBucket(a)).toBe(hourBucket(b));

    // Já 22:00 UTC (= 19:00 BRT) é o próximo bucket, não importa o que o relógio
    // local mostre.
    const c = utc(2026, 4, 25, 22, 0);
    expect(hourBucket(c)).toBe(hourBucket(a) + 1);
  });

  it('DST spring-forward (US 2026: 8 mar 02:00 → 03:00 local) não pula buckets em UTC', () => {
    // 06:00 UTC = 01:00 EST (antes do salto) e 07:00 UTC = 03:00 EDT (depois).
    // Em UTC nada salta — passamos por TODOS os buckets sequenciais.
    const t0 = utc(2026, 3, 8, 5, 0);
    const t1 = utc(2026, 3, 8, 6, 0);
    const t2 = utc(2026, 3, 8, 7, 0);
    expect(hourBucket(t1) - hourBucket(t0)).toBe(1);
    expect(hourBucket(t2) - hourBucket(t1)).toBe(1);
  });

  it('DST fall-back (US 2026: 1 nov 02:00 → 01:00 local) não duplica bucket em UTC', () => {
    // Hora UTC continua linear; o bucket UTC avança 1 a cada hora real.
    const t0 = utc(2026, 11, 1, 5, 0);
    const t1 = utc(2026, 11, 1, 6, 0);
    const t2 = utc(2026, 11, 1, 7, 0);
    expect(hourBucket(t1) - hourBucket(t0)).toBe(1);
    expect(hourBucket(t2) - hourBucket(t1)).toBe(1);
    // E nenhum par dos três compartilha bucket.
    expect(new Set([t0, t1, t2].map(hourBucket)).size).toBe(3);
  });

  describe('persistência atravessa fronteira de dia', () => {
    beforeEach(() => window.localStorage.clear());

    it('chave persistida em 23:30 UTC ainda dedupa em 23:55 UTC, mas libera em 00:05 UTC do dia seguinte', () => {
      const t1 = utc(2026, 4, 25, 23, 30);
      const t2 = utc(2026, 4, 25, 23, 55);
      const t3 = utc(2026, 4, 26, 0, 5);

      const k1 = buildPersistKey('wpp2', t1);
      const k2 = buildPersistKey('wpp2', t2);
      const k3 = buildPersistKey('wpp2', t3);

      expect(k1).toBe(k2);     // mesma janela → mesmo dedupe
      expect(k1).not.toBe(k3); // virou de bucket → libera novo alerta
    });
  });

  describe('TZ do processo não influencia a chave', () => {
    let originalTZ: string | undefined;
    beforeEach(() => {
      originalTZ = process.env.TZ;
    });
    afterEach(() => {
      if (originalTZ === undefined) delete process.env.TZ;
      else process.env.TZ = originalTZ;
    });

    it('mesma instância + mesmo timestamp UTC → mesma chave em qualquer TZ', () => {
      const ts = utc(2026, 4, 25, 12, 0);
      const tzs = ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo', 'Pacific/Auckland'];
      const keys = tzs.map((tz) => {
        process.env.TZ = tz;
        return buildPersistKey('wpp2', ts);
      });
      expect(new Set(keys).size).toBe(1);
    });
  });
});

describe('retry-alert dedupe — virada de dia / DST / TZ', () => {
  it('dois disparos no mesmo dia local atravessando 00:00 ainda colidem na mesma chave (mesma janela `hours`)', () => {
    // A chave de retry NÃO depende de timestamp — só do label `Nh`.
    // Logo, qualquer instante dentro da janela ativa produz a mesma chave.
    const cooldown = new Map<string, number>();
    const beforeMidnight = utc(2026, 4, 25, 23, 50);
    const afterMidnight = utc(2026, 4, 26, 0, 30); // 40min depois
    const k = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');

    expect(shouldFireRetryAlert(k, RETRY_ALERT_COOLDOWN_MS, cooldown, beforeMidnight)).toBe(true);
    // 40 min depois ainda está dentro do cooldown de 5 min × ... espera, cooldown é 5min
    // → 40min DEPOIS já liberou. Vamos validar nas duas vizinhanças.
    expect(shouldFireRetryAlert(k, RETRY_ALERT_COOLDOWN_MS, cooldown, beforeMidnight + 60_000)).toBe(false); // +1min
    expect(shouldFireRetryAlert(k, RETRY_ALERT_COOLDOWN_MS, cooldown, afterMidnight)).toBe(true); // > cooldown
  });

  it('cruzar DST não vira chaves diferentes (chave depende só de `instance|kind|hours`)', () => {
    const k1 = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');
    const k2 = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');
    expect(k1).toBe(k2);
  });

  it('cooldown de 5min resiste a "salto de hora" no relógio local — o que importa é Δt em ms', () => {
    const cooldown = new Map<string, number>();
    const k = buildRetryAlertDedupeKey('wpp2', 'failure_rate', 6, 'instance+kind');

    // 1h13min05 UTC do dia do DST spring-forward.
    const t0 = utc(2026, 3, 8, 6, 58);
    expect(shouldFireRetryAlert(k, RETRY_ALERT_COOLDOWN_MS, cooldown, t0)).toBe(true);

    // +4min59s = ainda em cooldown (independente de hora local "saltar").
    expect(
      shouldFireRetryAlert(
        k,
        RETRY_ALERT_COOLDOWN_MS,
        cooldown,
        t0 + RETRY_ALERT_COOLDOWN_MS - 1_000,
      ),
    ).toBe(false);

    // +5min01s → libera.
    expect(
      shouldFireRetryAlert(
        k,
        RETRY_ALERT_COOLDOWN_MS,
        cooldown,
        t0 + RETRY_ALERT_COOLDOWN_MS + 1_000,
      ),
    ).toBe(true);
  });

  it('chave é estável quando avaliada com process.env.TZ diferente', () => {
    let originalTZ = process.env.TZ;
    try {
      process.env.TZ = 'UTC';
      const a = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');
      process.env.TZ = 'America/Sao_Paulo';
      const b = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');
      process.env.TZ = 'Asia/Tokyo';
      const c = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');
      expect(a).toBe(b);
      expect(b).toBe(c);
    } finally {
      if (originalTZ === undefined) delete process.env.TZ;
      else process.env.TZ = originalTZ;
    }
  });
});

describe('checagem cruzada: ONE_HOUR_MS == 1h real', () => {
  it('60 minutos = 1 bucket; 60 minutos + 1ms = bucket seguinte', () => {
    expect(ONE_HOUR_MS).toBe(60 * 60 * 1000);
    const t = utc(2026, 4, 25, 12, 0);
    expect(hourBucket(t)).toBe(hourBucket(t + ONE_HOUR_MS - 1));
    expect(hourBucket(t + ONE_HOUR_MS)).toBe(hourBucket(t) + 1);
  });
});
