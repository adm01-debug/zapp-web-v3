import { describe, it, expect } from 'vitest';
import {
  evaluateAutoRefresh,
  computeLeadTimeMs,
  LEAD_MIN_MS,
  LEAD_MAX_MS,
} from '../qrAutoRefresh';

const NOW = 1_700_000_000_000;

describe('evaluateAutoRefresh', () => {
  describe('agenda o auto-refresh', () => {
    it('com lead dinâmico (10% do TTL clamp [2s,8s]) para TTL de 60s → lead = 6s', () => {
      const result = evaluateAutoRefresh({
        open: true,
        status: 'pending',
        expiresAt: NOW + 60_000,
        now: NOW,
      });
      expect(result).toEqual({ schedule: true, delayMs: 54_000, leadTimeMs: 6_000 });
    });

    it('respeita um leadTime customizado (override)', () => {
      const result = evaluateAutoRefresh({
        open: true,
        status: 'pending',
        expiresAt: NOW + 30_000,
        leadTimeMs: 10_000,
        now: NOW,
      });
      expect(result).toEqual({ schedule: true, delayMs: 20_000, leadTimeMs: 10_000 });
    });

    it('TTL longo (120s) clampa lead em 8s', () => {
      const result = evaluateAutoRefresh({
        open: true,
        status: 'pending',
        expiresAt: NOW + 120_000,
        now: NOW,
      });
      expect(result).toEqual({ schedule: true, delayMs: 112_000, leadTimeMs: LEAD_MAX_MS });
    });

    it('TTL curto (15s) usa o mínimo de 2s', () => {
      const result = evaluateAutoRefresh({
        open: true,
        status: 'pending',
        expiresAt: NOW + 15_000,
        now: NOW,
      });
      expect(result).toEqual({ schedule: true, delayMs: 13_000, leadTimeMs: LEAD_MIN_MS });
    });
  });

  describe('NÃO agenda', () => {
    it('quando a modal está fechada (motivo: dialog_closed)', () => {
      const result = evaluateAutoRefresh({
        open: false,
        status: 'pending',
        expiresAt: NOW + 60_000,
        now: NOW,
      });
      expect(result).toEqual({ schedule: false, reason: 'dialog_closed' });
    });

    it.each(['loading', 'connected', 'error'] as const)(
      'quando o status é "%s" (motivo: status_not_pending)',
      (status) => {
        const result = evaluateAutoRefresh({
          open: true,
          status,
          expiresAt: NOW + 60_000,
          now: NOW,
        });
        expect(result).toEqual({ schedule: false, reason: 'status_not_pending' });
      },
    );

    it('quando expiresAt é null (motivo: no_expires_at)', () => {
      const result = evaluateAutoRefresh({
        open: true,
        status: 'pending',
        expiresAt: null,
        now: NOW,
      });
      expect(result).toEqual({ schedule: false, reason: 'no_expires_at' });
    });

    it('quando expiresAt já passou (motivo: already_past_window)', () => {
      const result = evaluateAutoRefresh({
        open: true,
        status: 'pending',
        expiresAt: NOW - 1_000,
        now: NOW,
      });
      expect(result).toEqual({ schedule: false, reason: 'already_past_window' });
    });

    it('quando estamos exatamente dentro da janela leadTime (delay <= 0)', () => {
      const result = evaluateAutoRefresh({
        open: true,
        status: 'pending',
        expiresAt: NOW + 5_000,
        leadTimeMs: 5_000,
        now: NOW,
      });
      expect(result).toEqual({ schedule: false, reason: 'already_past_window' });
    });

    it('a precedência respeita "dialog_closed" antes de outros motivos', () => {
      const result = evaluateAutoRefresh({
        open: false,
        status: 'connected',
        expiresAt: null,
        now: NOW,
      });
      expect(result).toEqual({ schedule: false, reason: 'dialog_closed' });
    });
  });
});

describe('computeLeadTimeMs', () => {
  it('TTL típico (60s) → 6s (10% do TTL)', () => {
    expect(computeLeadTimeMs(60_000)).toBe(6_000);
  });

  it('TTL longo (120s) → clampa em LEAD_MAX_MS (8s)', () => {
    expect(computeLeadTimeMs(120_000)).toBe(LEAD_MAX_MS);
  });

  it('TTL razoável (20s) → respeita mínimo de 2s', () => {
    expect(computeLeadTimeMs(20_000)).toBe(LEAD_MIN_MS);
  });

  it('TTL curto (15s) → mínimo de 2s sem ultrapassar 50% do TTL', () => {
    expect(computeLeadTimeMs(15_000)).toBe(LEAD_MIN_MS);
  });

  it('TTL minúsculo (3s) → safety cap em 50% do TTL (1.5s)', () => {
    expect(computeLeadTimeMs(3_000)).toBe(1_500);
  });

  it('TTL inválido (0 ou negativo) → fallback para LEAD_MIN_MS', () => {
    expect(computeLeadTimeMs(0)).toBe(LEAD_MIN_MS);
    expect(computeLeadTimeMs(-1_000)).toBe(LEAD_MIN_MS);
  });

  it('invariante: lead sempre < TTL para qualquer TTL > 0', () => {
    for (const ttl of [1_000, 5_000, 15_000, 60_000, 120_000, 300_000]) {
      expect(computeLeadTimeMs(ttl)).toBeLessThan(ttl);
    }
  });
});
