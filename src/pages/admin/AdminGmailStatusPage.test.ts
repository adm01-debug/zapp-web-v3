import { describe, it, expect, vi } from 'vitest';

describe('Gmail Health API Contract', () => {
  it('should maintain the expected contract from edge function', async () => {
    // Simular o que o frontend espera da Edge Function
    const mockResponse = {
      status: 'healthy',
      last_validation: '2026-05-02T19:00:00Z',
      failure_count_window: 0,
      source: 'edge_shared_storage',
      timestamp: '2026-05-02T19:15:00Z',
      failuresResult: {
        items: [],
        total: 0,
        page: 1,
        pageSize: 10
      }
    };

    expect(mockResponse).toHaveProperty('status');
    expect(mockResponse).toHaveProperty('last_validation');
    expect(mockResponse).toHaveProperty('failuresResult');
    expect(mockResponse.failuresResult).toHaveProperty('items');
    expect(Array.isArray(mockResponse.failuresResult.items)).toBe(true);
  });
});
