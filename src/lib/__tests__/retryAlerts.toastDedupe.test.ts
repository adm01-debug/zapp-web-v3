/**
 * Testes unitários para a lógica de deduplicação do toast de retry.
 *
 * Foco no invariante combinado:
 *   shouldFireRetryAlert(buildRetryAlertDedupeKey(instance, kind, hours, mode), ...)
 *
 * Garante:
 *   1. Dispara exatamente 1× por (instância × kind) dentro do cooldown.
 *   2. Em modo `instance`, p95 e failure_rate compartilham o mesmo slot.
 *   3. Reset natural ao mudar a janela de horas (chave passa a incluir nova `hours`).
 *   4. Independência entre instâncias.
 *   5. Re-disparo após o cooldown expirar.
 *   6. Reset por troca de mode (chave muda de forma).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldFireRetryAlert,
  buildRetryAlertDedupeKey,
  RETRY_ALERT_COOLDOWN_MS,
} from '../retryAlerts';

function makeCooldownMap() {
  return new Map<string, number>();
}

describe('toast dedupe — shouldFireRetryAlert + buildRetryAlertDedupeKey', () => {
  let cooldown: Map<string, number>;
  beforeEach(() => {
    cooldown = makeCooldownMap();
  });

  describe('disparo único por (instância × janela)', () => {
    it('em modo instance+kind dispara 1x por kind dentro do cooldown', () => {
      const now = 1_000_000;
      const k1 = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');
      const k2 = buildRetryAlertDedupeKey('wpp2', 'failure_rate', 24, 'instance+kind');

      // Primeira vez: ambos disparam (kinds diferentes).
      expect(shouldFireRetryAlert(k1, RETRY_ALERT_COOLDOWN_MS, cooldown, now)).toBe(true);
      expect(shouldFireRetryAlert(k2, RETRY_ALERT_COOLDOWN_MS, cooldown, now)).toBe(true);

      // Repetidos dentro do cooldown: bloqueados.
      expect(shouldFireRetryAlert(k1, RETRY_ALERT_COOLDOWN_MS, cooldown, now + 1000)).toBe(false);
      expect(shouldFireRetryAlert(k2, RETRY_ALERT_COOLDOWN_MS, cooldown, now + 1000)).toBe(false);
      expect(shouldFireRetryAlert(k1, RETRY_ALERT_COOLDOWN_MS, cooldown, now + RETRY_ALERT_COOLDOWN_MS - 1)).toBe(false);
    });

    it('em modo instance, p95 e failure_rate colapsam num único toast por instância+janela', () => {
      const now = 1_000_000;
      const k1 = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance');
      const k2 = buildRetryAlertDedupeKey('wpp2', 'failure_rate', 24, 'instance');

      expect(k1).toBe(k2); // sanidade

      // Primeiro vence; segundo (mesma chave) é deduplicado.
      expect(shouldFireRetryAlert(k1, RETRY_ALERT_COOLDOWN_MS, cooldown, now)).toBe(true);
      expect(shouldFireRetryAlert(k2, RETRY_ALERT_COOLDOWN_MS, cooldown, now + 100)).toBe(false);
    });

    it('rajada de N tentativas na mesma janela produz exatamente 1 disparo', () => {
      const key = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');
      const start = 5_000_000;
      let fired = 0;
      for (let i = 0; i < 50; i++) {
        if (shouldFireRetryAlert(key, RETRY_ALERT_COOLDOWN_MS, cooldown, start + i * 1000)) {
          fired += 1;
        }
      }
      expect(fired).toBe(1);
    });
  });

  describe('reset ao mudar a janela de horas', () => {
    it('mudar de 1h para 24h gera chave diferente e libera novo disparo imediato', () => {
      const now = 2_000_000;
      const k1h = buildRetryAlertDedupeKey('wpp2', 'p95', 1, 'instance+kind');
      const k24h = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');

      expect(k1h).not.toBe(k24h);
      expect(shouldFireRetryAlert(k1h, RETRY_ALERT_COOLDOWN_MS, cooldown, now)).toBe(true);
      // Mesmo instante, mas janela diferente → outra chave → dispara.
      expect(shouldFireRetryAlert(k24h, RETRY_ALERT_COOLDOWN_MS, cooldown, now)).toBe(true);
      // E continua deduplicando dentro de cada janela.
      expect(shouldFireRetryAlert(k1h, RETRY_ALERT_COOLDOWN_MS, cooldown, now + 1)).toBe(false);
      expect(shouldFireRetryAlert(k24h, RETRY_ALERT_COOLDOWN_MS, cooldown, now + 1)).toBe(false);
    });

    it('o painel limpa o cooldown ao trocar de janela — primeiro disparo da nova janela passa', () => {
      // Simula o efeito do `useEffect(() => { cooldownRef.current = new Map() }, [hours, dedupeMode])`.
      const now = 3_000_000;
      const k1h = buildRetryAlertDedupeKey('wpp2', 'p95', 1, 'instance+kind');
      expect(shouldFireRetryAlert(k1h, RETRY_ALERT_COOLDOWN_MS, cooldown, now)).toBe(true);
      expect(shouldFireRetryAlert(k1h, RETRY_ALERT_COOLDOWN_MS, cooldown, now + 1000)).toBe(false);

      // Usuário troca para 24h → painel reseta o map.
      cooldown = makeCooldownMap();
      const k24h = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');
      expect(shouldFireRetryAlert(k24h, RETRY_ALERT_COOLDOWN_MS, cooldown, now + 1000)).toBe(true);
    });

    it('trocar de mode (instance ↔ instance+kind) também libera novo disparo (chave muda)', () => {
      const now = 4_000_000;
      const kAgg = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance');
      const kKind = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');
      expect(kAgg).not.toBe(kKind);

      expect(shouldFireRetryAlert(kAgg, RETRY_ALERT_COOLDOWN_MS, cooldown, now)).toBe(true);
      expect(shouldFireRetryAlert(kKind, RETRY_ALERT_COOLDOWN_MS, cooldown, now + 100)).toBe(true);
    });
  });

  describe('independência entre instâncias', () => {
    it('wpp2 e wpp3 não colidem — cada um dispara uma vez', () => {
      const now = 6_000_000;
      const k2 = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');
      const k3 = buildRetryAlertDedupeKey('wpp3', 'p95', 24, 'instance+kind');

      expect(shouldFireRetryAlert(k2, RETRY_ALERT_COOLDOWN_MS, cooldown, now)).toBe(true);
      expect(shouldFireRetryAlert(k3, RETRY_ALERT_COOLDOWN_MS, cooldown, now)).toBe(true);

      expect(shouldFireRetryAlert(k2, RETRY_ALERT_COOLDOWN_MS, cooldown, now + 1000)).toBe(false);
      expect(shouldFireRetryAlert(k3, RETRY_ALERT_COOLDOWN_MS, cooldown, now + 1000)).toBe(false);
    });
  });

  describe('re-disparo após cooldown', () => {
    it('exatamente no limite do cooldown: bloqueia; logo após: libera', () => {
      const now = 7_000_000;
      const key = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');

      expect(shouldFireRetryAlert(key, RETRY_ALERT_COOLDOWN_MS, cooldown, now)).toBe(true);
      // Em t = now + cooldown - 1 ainda está bloqueado.
      expect(shouldFireRetryAlert(key, RETRY_ALERT_COOLDOWN_MS, cooldown, now + RETRY_ALERT_COOLDOWN_MS - 1)).toBe(false);
      // Em t = now + cooldown libera (now - last >= cooldown).
      expect(shouldFireRetryAlert(key, RETRY_ALERT_COOLDOWN_MS, cooldown, now + RETRY_ALERT_COOLDOWN_MS)).toBe(true);
    });

    it('cooldown customizado de 0 ms permite disparos consecutivos', () => {
      const now = 8_000_000;
      const key = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');
      expect(shouldFireRetryAlert(key, 0, cooldown, now)).toBe(true);
      expect(shouldFireRetryAlert(key, 0, cooldown, now)).toBe(true);
    });
  });
});
