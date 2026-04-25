import { describe, it, expect } from 'vitest';
import { evaluateAutoRefresh } from '../qrAutoRefresh';

const NOW = 1_700_000_000_000;

describe('evaluateAutoRefresh', () => {
  describe('agenda o auto-refresh', () => {
    it('quando a modal está aberta, status é pending e expiresAt está no futuro além do leadTime', () => {
      const result = evaluateAutoRefresh({
        open: true,
        status: 'pending',
        expiresAt: NOW + 60_000,
        now: NOW,
      });
      expect(result).toEqual({ schedule: true, delayMs: 55_000 });
    });

    it('respeita um leadTime customizado', () => {
      const result = evaluateAutoRefresh({
        open: true,
        status: 'pending',
        expiresAt: NOW + 30_000,
        leadTimeMs: 10_000,
        now: NOW,
      });
      expect(result).toEqual({ schedule: true, delayMs: 20_000 });
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
        expiresAt: NOW + 5_000, // = leadTime padrão -> delay = 0
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
