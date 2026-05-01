/**
 * Whitespace-only contract for the Realtime Monitor dispatch aggregator.
 *
 * `error_code` and `error_reason` (surfaced as `error_message`) sometimes
 * arrive from upstream as `''` or just spaces (`'   '`, `'\n'`). The UI
 * MUST treat those values as absent, otherwise:
 *   - `aggregateByAgent` would group failures under an invisible bucket
 *     `'   '`, breaking the "top reasons" ranking and the legend.
 *   - `aggregateByChannel.lastError` would render a blank tooltip / cell
 *     instead of falling back to `error_code`.
 *
 * These tests pin the expected behavior end-to-end.
 */
import { describe, it, expect } from 'vitest';
import { aggregateByAgent, aggregateByChannel } from '../aggregations';
import type { FailedMessageRow } from '@/features/admin/useFailedMessages';

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

describe('aggregateByAgent — whitespace-only error_code', () => {
  it('does not bucket failures under a blank reason', () => {
    const rows = [
      row({ payload: { agent_email: 'a' }, error_code: '   ' }),
      row({ payload: { agent_email: 'a' }, error_code: '\t\n' }),
      row({ payload: { agent_email: 'a' }, error_code: '' }),
    ];
    const out = aggregateByAgent(rows);
    expect(out).toHaveLength(1);
    const reasons = out[0].topReasons.map(r => r.reason);
    // No invisible bucket made it into the ranking.
    expect(reasons).not.toContain('   ');
    expect(reasons).not.toContain('\t\n');
    expect(reasons).not.toContain('');
    // All three rows collapse to the documented fallback.
    expect(reasons).toEqual(['unknown']);
    expect(out[0].topReasons[0].count).toBe(3);
  });

  it('falls back to http_status when error_code is whitespace-only', () => {
    const rows = [
      row({ payload: { agent_email: 'a' }, error_code: '  ', http_status: 429 }),
      row({ payload: { agent_email: 'a' }, error_code: '\n', http_status: 503 }),
    ];
    const reasons = aggregateByAgent(rows)[0].topReasons.map(r => r.reason);
    expect(reasons).toEqual(expect.arrayContaining(['http_429', 'http_503']));
  });

  it('still groups normally when error_code has surrounding whitespace', () => {
    // Whitespace AROUND a real code must not split buckets.
    const rows = [
      row({ payload: { agent_email: 'a' }, error_code: 'rate_limit' }),
      row({ payload: { agent_email: 'a' }, error_code: '  rate_limit  ' }),
      row({ payload: { agent_email: 'a' }, error_code: '\trate_limit\n' }),
    ];
    const out = aggregateByAgent(rows);
    expect(out[0].topReasons).toEqual([{ reason: 'rate_limit', count: 3 }]);
  });
});

describe('aggregateByChannel — whitespace-only error_message / error_code', () => {
  it('treats whitespace-only error_message as absent and falls back to error_code', () => {
    const out = aggregateByChannel([
      row({
        instance_name: 'wpp2',
        error_message: '   ',
        error_code: 'timeout',
      }),
    ]);
    expect(out[0].lastError).toBe('timeout');
  });

  it('treats whitespace in BOTH fields as no last-error info', () => {
    const out = aggregateByChannel([
      row({
        instance_name: 'wpp2',
        error_message: '  ',
        error_code: '\t',
      }),
    ]);
    expect(out[0].lastError).toBeNull();
  });

  it('trims real values so the UI never renders leading/trailing whitespace', () => {
    const out = aggregateByChannel([
      row({
        instance_name: 'wpp2',
        error_message: '  upstream 503  ',
      }),
    ]);
    expect(out[0].lastError).toBe('upstream 503');
  });
});
