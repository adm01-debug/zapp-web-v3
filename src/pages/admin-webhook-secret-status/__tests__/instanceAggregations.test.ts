import { describe, it, expect } from 'vitest';
import {
  aggregateValidationByInstance,
  computeInstanceStatus,
  computeLatencyStats,
  deriveInstances,
  type SecretStatusEvent,
} from '../instanceAggregations';

const NOW = Date.now();
const isoMinutesAgo = (m: number) => new Date(NOW - m * 60 * 1000).toISOString();

const sample: SecretStatusEvent[] = [
  {
    event_type: 'MESSAGES_UPSERT',
    instance_name: 'wpp2',
    signature_valid: true,
    processed: true,
    processed_at: new Date(NOW - 60 * 1000 + 200).toISOString(),
    error_message: null,
    created_at: isoMinutesAgo(1),
  },
  {
    event_type: 'MESSAGES_UPSERT',
    instance_name: 'wpp2',
    signature_valid: true,
    processed: true,
    processed_at: new Date(NOW - 2 * 60 * 1000 + 500).toISOString(),
    error_message: null,
    created_at: isoMinutesAgo(2),
  },
  {
    event_type: 'PRESENCE_UPDATE',
    instance_name: 'wpp2',
    signature_valid: false,
    processed: false,
    processed_at: null,
    error_message: 'invalid signature',
    created_at: isoMinutesAgo(3),
  },
  {
    event_type: 'MESSAGES_UPSERT',
    instance_name: 'wpp_backup',
    signature_valid: null,
    processed: true,
    processed_at: new Date(NOW - 90 * 60 * 1000 + 100).toISOString(),
    error_message: null,
    created_at: isoMinutesAgo(90),
  },
];

describe('aggregateValidationByInstance', () => {
  it('groups counts by instance', () => {
    const r = aggregateValidationByInstance(sample);
    expect(r).toHaveLength(2);
    const wpp2 = r.find((s) => s.instance === 'wpp2')!;
    expect(wpp2.total).toBe(3);
    expect(wpp2.validated).toBe(2);
    expect(wpp2.invalid).toBe(1);
    expect(wpp2.errored).toBe(1);
    expect(wpp2.validationRate).toBeCloseTo(66.67, 1);
  });

  it('returns -1 rate when total is 0', () => {
    const r = aggregateValidationByInstance([]);
    expect(r).toEqual([]);
  });

  it('falls back to placeholder when instance_name is null', () => {
    const r = aggregateValidationByInstance([
      { ...sample[0], instance_name: null },
    ]);
    expect(r[0].instance).toBe('—');
  });
});

describe('computeInstanceStatus', () => {
  it('filters by instance and returns last event', () => {
    const status = computeInstanceStatus(sample, 'wpp2');
    expect(status.lastEvent?.type).toBe('MESSAGES_UPSERT');
    expect(status.recentTotal).toBe(3);
    expect(status.recentProcessed).toBe(2);
    expect(status.recentErrored).toBe(1);
    expect(status.sparkline).toHaveLength(10);
  });

  it('returns null lastEvent when nothing matches', () => {
    const status = computeInstanceStatus(sample, 'unknown');
    expect(status.lastEvent).toBeNull();
    expect(status.recentTotal).toBe(0);
  });

  it('aggregates across all when instance is null', () => {
    const status = computeInstanceStatus(sample, null);
    expect(status.lastEvent).not.toBeNull();
    expect(status.recentTotal).toBeGreaterThanOrEqual(3);
  });
});

describe('computeLatencyStats', () => {
  it('computes avg and p95', () => {
    const stats = computeLatencyStats(sample);
    expect(stats.samples).toBe(3);
    expect(stats.avgMs).not.toBeNull();
    expect(stats.p95Ms).not.toBeNull();
    expect(stats.avgMs!).toBeGreaterThan(0);
  });

  it('returns nulls when no processed_at', () => {
    const stats = computeLatencyStats([{ ...sample[2] }]);
    expect(stats.avgMs).toBeNull();
    expect(stats.samples).toBe(0);
  });

  it('clamps absurd negative or huge deltas', () => {
    const evil: SecretStatusEvent = {
      ...sample[0],
      processed_at: new Date(NOW + 10 * 60 * 1000).toISOString(),
      created_at: isoMinutesAgo(0),
    };
    const stats = computeLatencyStats([evil]);
    expect(stats.samples).toBe(0);
  });
});

describe('deriveInstances', () => {
  it('returns sorted unique non-null instances', () => {
    expect(deriveInstances(sample)).toEqual(['wpp2', 'wpp_backup']);
  });

  it('skips null instances', () => {
    expect(deriveInstances([{ ...sample[0], instance_name: null }])).toEqual([]);
  });
});
