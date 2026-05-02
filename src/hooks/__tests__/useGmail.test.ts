import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGmail } from '../useGmail';

vi.mock('@/integrations/supabase/client', () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue({}),
  };
  return {
    supabase: {
      functions: { invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      rpc: vi.fn().mockImplementation((fn) => {
        if (fn === 'rpc_gmail_token_status') return Promise.resolve({ data: [], error: null });
        if (fn === 'rpc_gmail_search_threads') return Promise.resolve({ data: [], error: null });
        return Promise.resolve({ data: null, error: null });
      }),
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: vi.fn(),
    },
  };
});

describe('useGmail', () => {
  it('deve montar sem erros', async () => {
    const { result } = renderHook(() => useGmail());
    expect(result.current).toBeDefined();
  });
});
