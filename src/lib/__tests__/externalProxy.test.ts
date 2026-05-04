import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { queryExternalProxy } from '../externalProxy';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: 'fake-token' } }, error: null })),
    },
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('externalProxy', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
    // Clear internal state if possible (breaker, inflight)
    // externalProxy exports queryExternalProxy
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('should successfully execute a select query', async () => {
    const mockResponse = {
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: [{ id: 1 }], rid: '123' })),
    };
    (global.fetch as any).mockResolvedValue(mockResponse);

    const result = await queryExternalProxy({ table: 'test_table', action: 'select' });

    expect(result.data).toEqual([{ id: 1 }]);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on 503 errors', async () => {
    const errorResponse = {
      ok: false,
      status: 503,
      text: () => Promise.resolve('Service Unavailable'),
    };
    const successResponse = {
      ok: true,
      status: 200,
      text: () => Promise.resolve(JSON.stringify({ data: [{ id: 1 }] })),
    };

    (global.fetch as any)
      .mockResolvedValueOnce(errorResponse)
      .mockResolvedValueOnce(successResponse);

    const result = await queryExternalProxy({ table: 'test_table', action: 'select' });

    expect(result.data).toEqual([{ id: 1 }]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle timeout/abort via signal', async () => {
    const controller = new AbortController();
    const mockFetch = vi.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        const error = new Error('The user aborted a request.');
        error.name = 'AbortError';
        reject(error);
      });
    });
    global.fetch = mockFetch;

    await expect(queryExternalProxy({ table: 'test', action: 'select', signal: controller.signal }))
      .rejects.toThrow('The user aborted a request.');
  });
});
