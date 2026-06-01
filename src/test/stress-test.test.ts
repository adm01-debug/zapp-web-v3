import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { simulateLoad } from './load-test';

describe('Stress Test Simulation', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([{ count: 100 }]), { status: 200 })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle parallel requests with acceptable latency', async () => {
    const target = 'https://example.supabase.co/rest/v1/profiles?select=count';
    const results = await simulateLoad(target, 10);

    expect(results.failure).toBe(0);
    expect(results.avgLatency).toBeLessThan(1000); // Max 1s
  });
});
