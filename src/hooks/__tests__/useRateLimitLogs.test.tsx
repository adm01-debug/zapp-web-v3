// @ts-nocheck
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockFrom = vi.fn();
const mockChannel = vi.fn().mockReturnValue({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
});
const mockRemoveChannel = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
    channel: (...args: any[]) => mockChannel(...args),
    removeChannel: (...args: any[]) => mockRemoveChannel(...args),
  },
}));

import { useRateLimitLogs } from '@/hooks/useRateLimitLogs';

const mockLogs = [
  { id: '1', ip_address: '1.2.3.4', endpoint: '/api/messages', user_id: null, request_count: 50, blocked: false, user_agent: 'Chrome', country: 'BR', city: 'SP', created_at: '2024-01-01' },
  { id: '2', ip_address: '5.6.7.8', endpoint: '/api/auth', user_id: 'u1', request_count: 200, blocked: true, user_agent: 'Bot', country: 'US', city: 'NY', created_at: '2024-01-01' },
  { id: '3', ip_address: '1.2.3.4', endpoint: '/api/messages', user_id: null, request_count: 30, blocked: false, user_agent: 'Chrome', country: 'BR', city: 'SP', created_at: '2024-01-02' },
];

describe('useRateLimitLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockLogs, error: null }),
        }),
      }),
    });
  });

  it('fetches logs on mount', async () => {
    const { result } = renderHook(() => useRateLimitLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.logs).toHaveLength(3);
  });

  it('calculates stats correctly', async () => {
    const { result } = renderHook(() => useRateLimitLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats).toBeDefined();
    expect(result.current.stats!.totalRequests).toBe(280); // 50+200+30
    expect(result.current.stats!.blockedRequests).toBe(1);
    expect(result.current.stats!.uniqueIPs).toBe(2);
  });

  it('calculates top endpoints', async () => {
    const { result } = renderHook(() => useRateLimitLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats!.topEndpoints.length).toBeGreaterThan(0);
  });

  it('calculates top IPs', async () => {
    const { result } = renderHook(() => useRateLimitLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats!.topIPs.length).toBe(2);
  });

  it('identifies blocked IPs correctly', async () => {
    const { result } = renderHook(() => useRateLimitLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const blockedIP = result.current.stats!.topIPs.find(ip => ip.blocked);
    expect(blockedIP?.ip).toBe('5.6.7.8');
  });

  it('handles empty logs', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    const { result } = renderHook(() => useRateLimitLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.logs).toEqual([]);
    expect(result.current.stats?.totalRequests).toBe(0);
  });

  it('handles fetch error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null, error: new Error('fail') }),
        }),
      }),
    });

    const { result } = renderHook(() => useRateLimitLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('subscribes to realtime changes', () => {
    renderHook(() => useRateLimitLogs());
    expect(mockChannel).toHaveBeenCalledWith('rate-limit-logs');
  });

  it('cleans up subscription on unmount', () => {
    const { unmount } = renderHook(() => useRateLimitLogs());
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useRateLimitLogs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(typeof result.current.refetch).toBe('function');
  });
});
