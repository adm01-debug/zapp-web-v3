import { describe, it, expect } from 'vitest';
import { aggregateByAgent, aggregateByChannel, extractAgent } from '../aggregations';
import type { FailedMessageRow } from '@/features/adminuseFailedMessages';

function row(overrides: Partial<FailedMessageRow> & { payload?: Record<string, unknown> }): FailedMessageRow {
  return {
    id: crypto.randomUUID(),
    instance_name: 'wpp2',
    remote_jid: null,
    payload: {},
    error_code: null,
    error_message: null,
    http_status: null,
    retry_count: 0,
    max_retries: 3,
    status: 'pending',
    last_attempt_at: '2026-04-25T10:00:00Z',
    next_attempt_at: null,
    succeeded_at: null,
    created_at: '2026-04-25T10:00:00Z',
    updated_at: '2026-04-25T10:00:00Z',
    ...overrides,
  };
}

describe('extractAgent', () => {
  it('reads from agent_email then falls back', () => {
    expect(extractAgent(row({ payload: { agent_email: 'a@x.com' } }))).toBe('a@x.com');
    expect(extractAgent(row({ payload: { assigned_to: 'b@x.com' } }))).toBe('b@x.com');
    expect(extractAgent(row({ payload: {} }))).toBe('sem-agente');
  });
});

describe('aggregateByAgent', () => {
  it('groups, ranks and computes percentages', () => {
    const rows = [
      row({ payload: { agent_email: 'a' }, error_code: 'rate_limit' }),
      row({ payload: { agent_email: 'a' }, error_code: 'rate_limit' }),
      row({ payload: { agent_email: 'a' }, http_status: 401 }),
      row({ payload: { agent_email: 'b' }, error_code: 'timeout' }),
    ];
    const out = aggregateByAgent(rows);
    expect(out[0].agent).toBe('a');
    expect(out[0].total).toBe(3);
    expect(out[0].pct).toBe(75);
    expect(out[0].topReasons[0]).toEqual({ reason: 'rate_limit', count: 2 });
    expect(out[1].agent).toBe('b');
    expect(out[1].pct).toBe(25);
  });

  it('handles empty input', () => {
    expect(aggregateByAgent([])).toEqual([]);
  });
});

describe('aggregateByChannel', () => {
  it('groups by instance and surfaces latest error', () => {
    const rows = [
      row({ instance_name: 'wpp2', last_attempt_at: '2026-04-25T09:00:00Z', error_message: 'old' }),
      row({ instance_name: 'wpp2', last_attempt_at: '2026-04-25T11:00:00Z', error_message: 'newest' }),
      row({ instance_name: 'wpp3', error_code: 'timeout' }),
    ];
    const out = aggregateByChannel(rows);
    expect(out[0].instance).toBe('wpp2');
    expect(out[0].total).toBe(2);
    expect(out[0].lastError).toBe('newest');
    expect(out[1].instance).toBe('wpp3');
  });
});
