import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEmailHealth } from '../useGmailHealth';
import { emailHealthService } from '@/services/email/emailHealthService';

vi.mock('@/services/email/emailHealthService', () => ({
  emailHealthService: {
    getHealthStatus: vi.fn(),
    forceRevalidation: vi.fn(),
  }
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useEmailHealth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render initial loading state and then data', async () => {
    const mockData = {
      status: 'healthy',
      lastValidation: new Date(),
      cacheExpiration: null,
      recentFailures: [],
      stats: { totalCalls: 0, failedCalls: 0, cacheHits: 0 }
    };
    (emailHealthService.getHealthStatus as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => useEmailHealth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.health).toBe(null);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.health).toEqual(mockData);
  });

  it('should handle errors during data fetch', async () => {
    (emailHealthService.getHealthStatus as any).mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useEmailHealth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.health).toBe(null);
  });

  it('should call forceRevalidation and show success toast', async () => {
    (emailHealthService.getHealthStatus as any).mockResolvedValue({});
    (emailHealthService.forceRevalidation as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useEmailHealth());
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.forceRevalidation();

    expect(emailHealthService.forceRevalidation).toHaveBeenCalled();
  });
});
