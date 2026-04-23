import { describe, it, expect } from 'vitest';
import {
  aggregateByType,
  aggregateByTypeAndInstance,
  aggregateHourly,
  categoryColor,
  categoryFill,
  type WebhookEventLite,
} from '../aggregations';

function ev(partial: Partial<WebhookEventLite>): WebhookEventLite {
  return {
    event_type: 'MESSAGES_UPSERT',
    instance_name: 'wpp2',
    processed: true,
    error_message: null,
    created_at: new Date().toISOString(),
    ...partial,
  };
}

describe('aggregateByType', () => {
  it('returns empty array for no rows', () => {
    expect(aggregateByType([])).toEqual([]);
  });

  it('counts totals, processed, errored and tracks lastAt', () => {
    const older = '2026-04-22T10:00:00Z';
    const newer = '2026-04-22T12:00:00Z';
    const rows = [
      ev({ event_type: 'MESSAGES_UPSERT', created_at: older }),
      ev({ event_type: 'MESSAGES_UPSERT', created_at: newer }),
      ev({ event_type: 'MESSAGES_UPSERT', error_message: 'boom', processed: false, created_at: newer }),
      ev({ event_type: 'PRESENCE_UPDATE', created_at: older }),
    ];
    const result = aggregateByType(rows);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('MESSAGES_UPSERT');
    expect(result[0].total).toBe(3);
    expect(result[0].processed).toBe(2);
    expect(result[0].errored).toBe(1);
    expect(result[0].lastAt).toBe(newer);
    expect(result[1].type).toBe('PRESENCE_UPDATE');
    expect(result[1].total).toBe(1);
  });
});

describe('aggregateByTypeAndInstance', () => {
  it('returns empty structures for empty input', () => {
    const r = aggregateByTypeAndInstance([]);
    expect(r.types).toEqual([]);
    expect(r.instances).toEqual([]);
    expect(r.matrix).toEqual({});
  });

  it('builds matrix and dedupes instances', () => {
    const rows = [
      ev({ event_type: 'MESSAGES_UPSERT', instance_name: 'wpp2' }),
      ev({ event_type: 'MESSAGES_UPSERT', instance_name: 'wpp2' }),
      ev({ event_type: 'MESSAGES_UPSERT', instance_name: 'wpp1' }),
      ev({ event_type: 'CALL', instance_name: 'wpp1' }),
    ];
    const r = aggregateByTypeAndInstance(rows);
    expect(r.instances).toEqual(['wpp1', 'wpp2']);
    expect(r.types).toEqual(['MESSAGES_UPSERT', 'CALL']); // sorted by total desc
    expect(r.matrix.MESSAGES_UPSERT.wpp2).toBe(2);
    expect(r.matrix.MESSAGES_UPSERT.wpp1).toBe(1);
    expect(r.matrix.CALL.wpp1).toBe(1);
  });
});

describe('aggregateHourly', () => {
  it('produces 24+1 buckets for 24h window', () => {
    const r = aggregateHourly([], 24);
    expect(r.length).toBeGreaterThanOrEqual(24);
    expect(r.length).toBeLessThanOrEqual(26);
  });

  it('produces fewer wide buckets for 7d window', () => {
    const r = aggregateHourly([], 168);
    // 168h / 6h = 28 buckets ± 1
    expect(r.length).toBeGreaterThanOrEqual(27);
    expect(r.length).toBeLessThanOrEqual(30);
  });

  it('counts processed vs errored into the matching bucket', () => {
    const now = new Date();
    const rows = [
      ev({ created_at: now.toISOString(), processed: true }),
      ev({ created_at: now.toISOString(), processed: false, error_message: 'x' }),
    ];
    const r = aggregateHourly(rows, 24);
    const totalProcessed = r.reduce((s, b) => s + b.processed, 0);
    const totalErrored = r.reduce((s, b) => s + b.errored, 0);
    expect(totalProcessed).toBe(1);
    expect(totalErrored).toBe(1);
  });
});

describe('categoryColor / categoryFill', () => {
  it('returns known semantic tokens per group', () => {
    expect(categoryColor('MESSAGES_UPSERT')).toBe('text-primary');
    expect(categoryColor('CONNECTION_UPDATE')).toBe('text-warning');
    expect(categoryColor('PRESENCE_UPDATE')).toBe('text-muted-foreground');
    expect(categoryColor('CALL')).toBe('text-accent-foreground');
    expect(categoryColor('LABELS_ASSOCIATION')).toBe('text-secondary-foreground');
    expect(categoryColor('UNKNOWN_EVENT')).toBe('text-foreground');

    expect(categoryFill('MESSAGES_UPSERT')).toMatch(/--primary/);
    expect(categoryFill('CONNECTION_UPDATE')).toMatch(/--warning/);
  });
});
