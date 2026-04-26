/**
 * Whitespace-only contract for `failureRootCause.classifyRootCause`.
 *
 * Documents and pins the desired UI behavior: when `error_code` arrives as
 * `''`, `'   '`, `'\t\n'`, etc. we treat it as **absent** and fall back to
 * `http_status` → `error_message` heuristics. This avoids classifying real
 * failures as `'unknown'` just because the upstream wrote whitespace into
 * the column, and keeps the pipeline aligned with how the admin aggregator
 * (`dispatchReason`) collapses dispatch reasons.
 */
import { describe, it, expect } from 'vitest';
import { classifyRootCause } from '@/lib/failureRootCause';

describe('classifyRootCause — whitespace-only error_code', () => {
  it('treats empty string error_code as absent and uses http_status', () => {
    expect(classifyRootCause({ error_code: '', http_status: 429 })).toBe('rate_limit');
    expect(classifyRootCause({ error_code: '', http_status: 401 })).toBe('auth');
  });

  it('treats whitespace-only error_code as absent and uses http_status', () => {
    expect(classifyRootCause({ error_code: '   ', http_status: 503 })).toBe('unavailable');
    expect(classifyRootCause({ error_code: '\t\n', http_status: 404 })).toBe('not_found');
  });

  it('falls through to error_message heuristics when both code and status are blank-ish', () => {
    expect(
      classifyRootCause({
        error_code: '   ',
        http_status: null,
        error_message: 'connection timed out after 14000ms',
      }),
    ).toBe('timeout');

    expect(
      classifyRootCause({
        error_code: '\n',
        http_status: null,
        error_message: 'fetch failed: ECONNRESET',
      }),
    ).toBe('network');
  });

  it('returns "unknown" only when every signal is blank or missing', () => {
    expect(classifyRootCause({ error_code: '   ', http_status: null, error_message: '   ' })).toBe('unknown');
    expect(classifyRootCause({ error_code: '', http_status: null, error_message: '' })).toBe('unknown');
    expect(classifyRootCause({ error_code: null, http_status: null, error_message: null })).toBe('unknown');
  });

  it('still honors a real error_code with surrounding whitespace (trim is applied)', () => {
    expect(classifyRootCause({ error_code: '  rate_limit  ' })).toBe('rate_limit');
    expect(classifyRootCause({ error_code: '\tTIMEOUT\n' })).toBe('timeout');
  });
});
