import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(),
  }),
}));

import {
  classifySeverity,
  recordQueryEvent,
  getTelemetrySnapshot,
  resetTelemetry,
} from '../clientTelemetry';

describe('clientTelemetry', () => {
  beforeEach(() => {
    resetTelemetry();
  });

  describe('classifySeverity', () => {
    it('returns ok for fast queries', () => {
      expect(classifySeverity(100, false, false)).toBe('ok');
      expect(classifySeverity(1499, false, false)).toBe('ok');
    });
    it('returns slow at >=1500ms', () => {
      expect(classifySeverity(1500, false, false)).toBe('slow');
      expect(classifySeverity(3999, false, false)).toBe('slow');
    });
    it('returns very_slow at >=4000ms', () => {
      expect(classifySeverity(4000, false, false)).toBe('very_slow');
    });
    it('error wins over duration', () => {
      expect(classifySeverity(100, true, false)).toBe('error');
    });
    it('timeout wins over error and duration', () => {
      expect(classifySeverity(100, true, true)).toBe('timeout');
    });
  });

  describe('recordQueryEvent', () => {
    const baseEv = {
      operation: 'rpc' as const,
      source: 'externalProxy' as const,
      target: 'rpc_test',
      limit: 50,
      offset: 0,
      filters: { x: 1 },
      recordCount: 10,
      startedAt: 0,
    };

    it('auto-classifies severity when omitted', () => {
      const ev = recordQueryEvent({ ...baseEv, durationMs: 200 });
      expect(ev.severity).toBe('ok');
      const slow = recordQueryEvent({ ...baseEv, durationMs: 2000 });
      expect(slow.severity).toBe('slow');
    });

    it('aggregates bySeverity and bySource', () => {
      recordQueryEvent({ ...baseEv, durationMs: 100 });
      recordQueryEvent({ ...baseEv, durationMs: 2000 });
      recordQueryEvent({ ...baseEv, durationMs: 5000 });
      const s = getTelemetrySnapshot();
      expect(s.total).toBe(3);
      expect(s.bySeverity.ok).toBe(1);
      expect(s.bySeverity.slow).toBe(1);
      expect(s.bySeverity.very_slow).toBe(1);
      expect(s.bySource.externalProxy).toBe(3);
    });

    it('keeps only last 50 in recentEvents', () => {
      for (let i = 0; i < 60; i++) {
        recordQueryEvent({ ...baseEv, durationMs: 100 });
      }
      const s = getTelemetrySnapshot();
      expect(s.recentEvents.length).toBe(50);
      expect(s.total).toBe(60);
    });

    it('keeps only last 20 in slowEvents and skips ok', () => {
      for (let i = 0; i < 25; i++) {
        recordQueryEvent({ ...baseEv, durationMs: 2000 }); // slow
      }
      recordQueryEvent({ ...baseEv, durationMs: 100 }); // ok — not in slowEvents
      const s = getTelemetrySnapshot();
      expect(s.slowEvents.length).toBe(20);
      expect(s.slowEvents.every((e) => e.severity !== 'ok')).toBe(true);
    });

    it('computes p95DurationMs over recents', () => {
      for (let i = 0; i < 18; i++) recordQueryEvent({ ...baseEv, durationMs: 100 });
      for (let i = 0; i < 2; i++) recordQueryEvent({ ...baseEv, durationMs: 5000 });
      const s = getTelemetrySnapshot();
      expect(s.p95DurationMs).toBeGreaterThan(100);
    });

    it('publishes snapshot to window.__queryTelemetry', () => {
      recordQueryEvent({ ...baseEv, durationMs: 100 });
      const w = window as unknown as { __queryTelemetry?: { total: number } };
      expect(w.__queryTelemetry?.total).toBe(1);
    });
  });

  describe('resetTelemetry', () => {
    it('zeroes counters and clears events', () => {
      recordQueryEvent({
        operation: 'rpc', source: 'externalProxy', target: 't',
        durationMs: 100, limit: null, offset: null, filters: null,
        recordCount: 0, startedAt: 0,
      });
      resetTelemetry();
      const s = getTelemetrySnapshot();
      expect(s.total).toBe(0);
      expect(s.recentEvents.length).toBe(0);
      expect(s.slowEvents.length).toBe(0);
      expect(s.bySeverity.ok).toBe(0);
    });
  });
});
