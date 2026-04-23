import { describe, it, expect, beforeEach } from 'vitest';
import {
  ALERT_COOLDOWN_MS,
  DEFAULT_ALERT_CONFIG,
  evaluateAllInstances,
  evaluateInstanceHealth,
  loadAlertConfig,
  saveAlertConfig,
  shouldFireAlert,
  type InstanceHealthStats,
  type WebhookAlertConfig,
} from '../webhookHealthAlerts';

const NOW = new Date('2026-04-23T12:00:00Z').getTime();

const makeStats = (overrides: Partial<InstanceHealthStats> = {}): InstanceHealthStats => ({
  instance: 'wpp2',
  total: 50,
  invalid: 0,
  total24h: 1000,
  lastEventAt: new Date(NOW - 30_000).toISOString(), // 30s atrás
  ...overrides,
});

describe('webhookHealthAlerts', () => {
  beforeEach(() => {
    try { localStorage.clear(); } catch { /* ignore */ }
  });

  describe('evaluateInstanceHealth — signature_spike', () => {
    it('does not fire below minSampleSize even with high invalid rate', () => {
      const r = evaluateInstanceHealth(
        makeStats({ total: 5, invalid: 5 }),
        DEFAULT_ALERT_CONFIG,
        NOW,
      );
      expect(r.find((b) => b.type === 'signature_spike')).toBeUndefined();
    });

    it('fires when invalid rate ≥ threshold and sample sufficient', () => {
      const r = evaluateInstanceHealth(
        makeStats({ total: 100, invalid: 8 }), // 8% ≥ default 5%
        DEFAULT_ALERT_CONFIG,
        NOW,
      );
      const spike = r.find((b) => b.type === 'signature_spike');
      expect(spike).toBeDefined();
      expect(spike?.value).toBe(8);
      expect(spike?.reason).toContain('8.0%');
    });

    it('does not fire when invalid rate below threshold', () => {
      const r = evaluateInstanceHealth(
        makeStats({ total: 200, invalid: 4 }), // 2%
        DEFAULT_ALERT_CONFIG,
        NOW,
      );
      expect(r.find((b) => b.type === 'signature_spike')).toBeUndefined();
    });
  });

  describe('evaluateInstanceHealth — webhook_silence', () => {
    it('fires when last event is older than silenceMinutes', () => {
      const r = evaluateInstanceHealth(
        makeStats({ lastEventAt: new Date(NOW - 15 * 60_000).toISOString() }),
        DEFAULT_ALERT_CONFIG,
        NOW,
      );
      const sil = r.find((b) => b.type === 'webhook_silence');
      expect(sil).toBeDefined();
      expect(sil?.value).toBe(15);
    });

    it('does NOT fire on dormant instance (total24h=0) even if very silent', () => {
      const r = evaluateInstanceHealth(
        makeStats({
          total24h: 0,
          total: 0,
          lastEventAt: new Date(NOW - 6 * 60 * 60 * 1000).toISOString(),
        }),
        DEFAULT_ALERT_CONFIG,
        NOW,
      );
      expect(r.find((b) => b.type === 'webhook_silence')).toBeUndefined();
    });

    it('does not fire when last event is within window', () => {
      const r = evaluateInstanceHealth(
        makeStats({ lastEventAt: new Date(NOW - 60_000).toISOString() }),
        DEFAULT_ALERT_CONFIG,
        NOW,
      );
      expect(r.find((b) => b.type === 'webhook_silence')).toBeUndefined();
    });

    it('handles missing lastEventAt safely', () => {
      const r = evaluateInstanceHealth(
        makeStats({ lastEventAt: null, total: 0 }),
        DEFAULT_ALERT_CONFIG,
        NOW,
      );
      expect(r).toEqual([]);
    });
  });

  describe('master switch', () => {
    it('returns empty when disabled', () => {
      const cfg: WebhookAlertConfig = { ...DEFAULT_ALERT_CONFIG, enabled: false };
      const r = evaluateInstanceHealth(
        makeStats({ total: 100, invalid: 50 }),
        cfg,
        NOW,
      );
      expect(r).toEqual([]);
    });
  });

  describe('evaluateAllInstances', () => {
    it('aggregates breaches across instances', () => {
      const list: InstanceHealthStats[] = [
        makeStats({ instance: 'wpp2', total: 100, invalid: 10 }), // spike
        makeStats({ instance: 'wpp3', lastEventAt: new Date(NOW - 20 * 60_000).toISOString() }), // silence
        makeStats({ instance: 'wpp4' }), // healthy
      ];
      const r = evaluateAllInstances(list, DEFAULT_ALERT_CONFIG, NOW);
      expect(r).toHaveLength(2);
      expect(r.map((b) => b.instance).sort()).toEqual(['wpp2', 'wpp3']);
    });
  });

  describe('persistence', () => {
    it('returns defaults when nothing stored', () => {
      expect(loadAlertConfig()).toEqual(DEFAULT_ALERT_CONFIG);
    });

    it('roundtrips saved config', () => {
      const cfg: WebhookAlertConfig = {
        invalidRatePct: 12,
        minSampleSize: 50,
        silenceMinutes: 30,
        enabled: false,
      };
      expect(saveAlertConfig(cfg)).toBe(true);
      expect(loadAlertConfig()).toEqual(cfg);
    });

    it('falls back to defaults on invalid stored data', () => {
      try {
        localStorage.setItem(
          'zappweb:webhook-health-alerts',
          JSON.stringify({ invalidRatePct: 'abc', silenceMinutes: -5, minSampleSize: NaN }),
        );
      } catch { /* ignore */ }
      const c = loadAlertConfig();
      expect(c.invalidRatePct).toBe(DEFAULT_ALERT_CONFIG.invalidRatePct);
      expect(c.silenceMinutes).toBe(DEFAULT_ALERT_CONFIG.silenceMinutes);
      expect(c.minSampleSize).toBe(DEFAULT_ALERT_CONFIG.minSampleSize);
    });

    it('clamps invalidRatePct to 0-100 range', () => {
      try {
        localStorage.setItem(
          'zappweb:webhook-health-alerts',
          JSON.stringify({ invalidRatePct: 250 }),
        );
      } catch { /* ignore */ }
      expect(loadAlertConfig().invalidRatePct).toBe(DEFAULT_ALERT_CONFIG.invalidRatePct);
    });
  });

  describe('shouldFireAlert (cooldown)', () => {
    it('fires the first time', () => {
      const map = new Map<string, number>();
      expect(shouldFireAlert('wpp2|spike', ALERT_COOLDOWN_MS, map, NOW)).toBe(true);
    });

    it('blocks repeat within cooldown window', () => {
      const map = new Map<string, number>();
      shouldFireAlert('wpp2|spike', ALERT_COOLDOWN_MS, map, NOW);
      expect(shouldFireAlert('wpp2|spike', ALERT_COOLDOWN_MS, map, NOW + 60_000)).toBe(false);
    });

    it('allows again after cooldown', () => {
      const map = new Map<string, number>();
      shouldFireAlert('wpp2|spike', ALERT_COOLDOWN_MS, map, NOW);
      expect(
        shouldFireAlert('wpp2|spike', ALERT_COOLDOWN_MS, map, NOW + ALERT_COOLDOWN_MS + 1),
      ).toBe(true);
    });

    it('isolates keys by instance+type', () => {
      const map = new Map<string, number>();
      shouldFireAlert('wpp2|spike', ALERT_COOLDOWN_MS, map, NOW);
      expect(shouldFireAlert('wpp3|spike', ALERT_COOLDOWN_MS, map, NOW)).toBe(true);
      expect(shouldFireAlert('wpp2|silence', ALERT_COOLDOWN_MS, map, NOW)).toBe(true);
    });
  });
});
