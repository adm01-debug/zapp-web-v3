import { describe, it, expect, beforeEach } from 'vitest';
import { __test__ } from '@/features/admin/hooks/monitoring/useIdempotencyMissAlerts';

const {
  ALERT_DEDUPE_STORAGE_KEY,
  ONE_HOUR_MS,
  PERSIST_TTL_MS,
  hourBucket,
  buildPersistKey,
  loadPersistedAlerts,
  savePersistedAlerts,
} = __test__;

describe('useIdempotencyMissAlerts — localStorage persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('hourBucket aligns to wall-clock hours', () => {
    const t = Date.UTC(2026, 3, 25, 12, 30, 0);
    expect(hourBucket(t)).toBe(hourBucket(t + 5 * 60_000));
    expect(hourBucket(t)).not.toBe(hourBucket(t + ONE_HOUR_MS));
  });

  it('buildPersistKey combines instance and hour bucket', () => {
    const ts = Date.UTC(2026, 3, 25, 10, 0, 0);
    const key = buildPersistKey('wpp2', ts);
    expect(key).toMatch(/^idempotency-miss:wpp2:\d+$/);
    expect(buildPersistKey('wpp2', ts)).toBe(buildPersistKey('wpp2', ts + 1000));
    expect(buildPersistKey('wpp2', ts)).not.toBe(buildPersistKey('wpp3', ts));
  });

  it('round-trips a dedupe map through localStorage', () => {
    const now = Date.now();
    const map = new Map<string, number>([
      [buildPersistKey('wpp2', now), now],
      [buildPersistKey('wpp3', now), now - 5 * 60_000],
    ]);
    savePersistedAlerts(map);

    const restored = loadPersistedAlerts();
    expect(restored.size).toBe(2);
    expect(restored.get(buildPersistKey('wpp2', now))).toBe(now);
  });

  it('drops entries older than PERSIST_TTL_MS on load', () => {
    const now = Date.now();
    const stale = now - PERSIST_TTL_MS - 60_000;
    const fresh = now - 60_000;
    window.localStorage.setItem(
      ALERT_DEDUPE_STORAGE_KEY,
      JSON.stringify({
        'idempotency-miss:wpp2:111': stale,
        'idempotency-miss:wpp3:222': fresh,
      })
    );
    const restored = loadPersistedAlerts();
    expect(restored.has('idempotency-miss:wpp2:111')).toBe(false);
    expect(restored.get('idempotency-miss:wpp3:222')).toBe(fresh);
  });

  it('returns empty map when storage is empty or invalid', () => {
    expect(loadPersistedAlerts().size).toBe(0);
    window.localStorage.setItem(ALERT_DEDUPE_STORAGE_KEY, 'not-json');
    expect(loadPersistedAlerts().size).toBe(0);
  });

  it('does not throw when localStorage is unavailable', () => {
    expect(() => savePersistedAlerts(new Map([['k', Date.now()]]))).not.toThrow();
  });
});
