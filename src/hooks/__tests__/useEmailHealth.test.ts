import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGmailHealth } from '../useGmailHealth';
import { gmailHealthService } from '@/services/gmail/gmailHealthService';

vi.mock('@/services/gmail/gmailHealthService', () => ({
  gmailHealthService: {
    getHealthStatus: vi.fn(),
    forceRevalidation: vi.fn(),
  }
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useGmailHealth hook', () => {
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
    (gmailHealthService.getHealthStatus as any).mockResolvedValue(mockData);

    const { result } = renderHook(() => useGmailHealth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.health).toBe(null);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.health).toEqual(mockData);
  });

  it('should handle errors during data fetch', async () => {
    (gmailHealthService.getHealthStatus as any).mockRejectedValue(new Error('Fetch failed'));

    const { result } = renderHook(() => useGmailHealth());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.health).toBe(null);
  });

  it('should call forceRevalidation and show success toast', async () => {
    (gmailHealthService.getHealthStatus as any).mockResolvedValue({});
    (gmailHealthService.forceRevalidation as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useGmailHealth());
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await result.current.forceRevalidation();

    expect(gmailHealthService.forceRevalidation).toHaveBeenCalled();
  });
});
