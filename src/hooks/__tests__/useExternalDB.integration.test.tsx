import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useExternalSelect, useExternalRPC } from '../useExternalDB';
import { getExternalSupabase } from '@/integrations/supabase/externalClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock dependencies
vi.mock('@/integrations/supabase/externalClient', () => ({
  getExternalSupabase: vi.fn(),
  isExternalConfigured: true,
}));

vi.mock('@/integrations/datasource/sentinel', () => ({
  validateEntityAccess: vi.fn(),
  validateRpcAccess: vi.fn(),
}));

describe('useExternalDB - Integration Tests', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  describe('useExternalSelect', () => {
    it('should call externalSupabase.from with correct parameters', async () => {
      const mockData = [{ id: '1', content: 'test message' }];
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        filter: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockData, error: null, count: 1 }),
      };
      
      (getExternalSupabase as any).mockReturnValue({
        from: vi.fn().mockReturnValue(mockFrom),
      });

      const { result } = renderHook(
        () => useExternalSelect({
          table: 'evolution_messages',
          filters: [{ column: 'instance_name', operator: 'eq', value: 'wpp2' }],
          limit: 10,
          offset: 0,
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(getExternalSupabase).toHaveBeenCalled();
      expect(result.current.data?.data).toEqual(mockData);
      expect(result.current.data?.meta.record_count).toBe(1);
    });

    it('should handle pagination (limit/offset) correctly', async () => {
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
      
      (getExternalSupabase as any).mockReturnValue({
        from: vi.fn().mockReturnValue(mockFrom),
      });

      const { result } = renderHook(
        () => useExternalSelect({
          table: 'evolution_messages',
          limit: 20,
          offset: 40,
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      
      // range(offset, offset + limit - 1) => range(40, 40 + 20 - 1) => range(40, 59)
      expect(mockFrom.range).toHaveBeenCalledWith(40, 59);
    });
  });

  describe('useExternalRPC', () => {
    it('should call externalSupabase.rpc correctly', async () => {
      const mockResult = [{ id: 'msg-1' }];
      (getExternalSupabase as any).mockReturnValue({
        rpc: vi.fn().mockResolvedValue({ data: mockResult, error: null }),
      });

      const { result } = renderHook(
        () => useExternalRPC({
          rpc: 'rpc_list_messages_lite',
          params: { p_instance: 'wpp2' },
        }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.data).toEqual(mockResult);
    });
  });
});
