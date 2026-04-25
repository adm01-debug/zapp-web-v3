import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_RETRY_DEDUPE_MODE,
  RETRY_DEDUPE_MODE_STORAGE_KEY,
  buildRetryAlertDedupeKey,
  loadRetryAlertDedupeMode,
  saveRetryAlertDedupeMode,
} from '../retryAlerts';

describe('retryAlerts — dedupe granularity', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('default mode is instance+kind', () => {
    expect(DEFAULT_RETRY_DEDUPE_MODE).toBe('instance+kind');
    expect(loadRetryAlertDedupeMode()).toBe('instance+kind');
  });

  it('round-trips a saved mode through localStorage', () => {
    expect(saveRetryAlertDedupeMode('instance')).toBe(true);
    expect(loadRetryAlertDedupeMode()).toBe('instance');
    expect(saveRetryAlertDedupeMode('instance+kind')).toBe(true);
    expect(loadRetryAlertDedupeMode()).toBe('instance+kind');
  });

  it('falls back to default when storage holds garbage', () => {
    window.localStorage.setItem(RETRY_DEDUPE_MODE_STORAGE_KEY, JSON.stringify('nope'));
    expect(loadRetryAlertDedupeMode()).toBe(DEFAULT_RETRY_DEDUPE_MODE);
  });

  describe('buildRetryAlertDedupeKey', () => {
    it('instance+kind: p95 e failure_rate produzem chaves distintas', () => {
      const a = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind');
      const b = buildRetryAlertDedupeKey('wpp2', 'failure_rate', 24, 'instance+kind');
      expect(a).not.toBe(b);
      expect(a).toBe('wpp2|p95|24h');
      expect(b).toBe('wpp2|failure_rate|24h');
    });

    it('instance: p95 e failure_rate colapsam na mesma chave', () => {
      const a = buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance');
      const b = buildRetryAlertDedupeKey('wpp2', 'failure_rate', 24, 'instance');
      expect(a).toBe(b);
      expect(a).toBe('wpp2|24h');
    });

    it('a janela (hours) sempre faz parte da chave em ambos os modos', () => {
      expect(buildRetryAlertDedupeKey('wpp2', 'p95', 1, 'instance+kind')).not.toBe(
        buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance+kind'),
      );
      expect(buildRetryAlertDedupeKey('wpp2', 'p95', 1, 'instance')).not.toBe(
        buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance'),
      );
    });

    it('instâncias diferentes nunca colidem', () => {
      expect(buildRetryAlertDedupeKey('wpp2', 'p95', 24, 'instance')).not.toBe(
        buildRetryAlertDedupeKey('wpp3', 'p95', 24, 'instance'),
      );
    });

    it('default arg = DEFAULT_RETRY_DEDUPE_MODE', () => {
      expect(buildRetryAlertDedupeKey('wpp2', 'p95', 24)).toBe(
        buildRetryAlertDedupeKey('wpp2', 'p95', 24, DEFAULT_RETRY_DEDUPE_MODE),
      );
    });
  });
});
