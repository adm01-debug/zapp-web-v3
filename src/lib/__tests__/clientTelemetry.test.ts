import { describe, it, expect, beforeEach } from 'vitest';
import { 
  recordQueryEvent, 
  getTelemetrySnapshot, 
  resetTelemetry, 
  classifySeverity 
} from '../clientTelemetry';

describe('clientTelemetry', () => {
  beforeEach(() => {
    resetTelemetry();
  });

  it('should classify severity correctly', () => {
    expect(classifySeverity(100, false, false)).toBe('ok');
    expect(classifySeverity(2000, false, false)).toBe('slow');
    expect(classifySeverity(5000, false, false)).toBe('very_slow');
    expect(classifySeverity(100, true, false)).toBe('error');
    expect(classifySeverity(100, false, true)).toBe('timeout');
  });

  it('should aggregate events and calculate averages', () => {
    recordQueryEvent({
      operation: 'select',
      source: 'lovableCloud',
      target: 'table1',
      durationMs: 100,
      limit: null,
      offset: null,
      filters: null,
      recordCount: 1,
      startedAt: Date.now()
    });

    recordQueryEvent({
      operation: 'select',
      source: 'lovableCloud',
      target: 'table1',
      durationMs: 300,
      limit: null,
      offset: null,
      filters: null,
      recordCount: 1,
      startedAt: Date.now()
    });

    const snapshot = getTelemetrySnapshot();
    expect(snapshot.total).toBe(2);
    expect(snapshot.avgDurationMs).toBe(200);
    expect(snapshot.bySeverity.ok).toBe(2);
  });

  it('should track slow events separately', () => {
    recordQueryEvent({
      operation: 'select',
      source: 'externalProxy',
      target: 'slow_table',
      durationMs: 5000,
      limit: null,
      offset: null,
      filters: null,
      recordCount: 0,
      startedAt: Date.now()
    });

    const snapshot = getTelemetrySnapshot();
    expect(snapshot.bySeverity.very_slow).toBe(1);
    expect(snapshot.slowEvents).toHaveLength(1);
    expect(snapshot.slowEvents[0].target).toBe('slow_table');
  });

  it('should calculate p95 correctly', () => {
    // Record 20 events with durations 1..20
    for (let i = 1; i <= 20; i++) {
      recordQueryEvent({
        operation: 'select',
        source: 'lovableCloud',
        target: 'test',
        durationMs: i * 100,
        limit: null,
        offset: null,
        filters: null,
        recordCount: 0,
        startedAt: Date.now()
      });
    }

    const snapshot = getTelemetrySnapshot();
    // 20 * 0.95 = 19th index (sorted). Sorted values are 100, 200, ..., 2000.
    // 19th element is 1900.
    expect(snapshot.p95DurationMs).toBe(1900);
  });
});
