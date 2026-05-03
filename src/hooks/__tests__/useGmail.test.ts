import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGmail } from '../useGmail';
import { safeClient } from '@/integrations/supabase/safeClient';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/safeClient', () => ({
  safeClient: {
    from: vi.fn(),
    rpc: vi.fn(),
  }
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    auth: {
      getUser: vi.fn(),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  }
}));

describe('useGmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (safeClient.rpc as any).mockResolvedValue({ data: [], error: null });
    (safeClient.from as any).mockResolvedValue({ data: [], error: null });
  });

  it('deve carregar contas com sucesso', async () => {
    const mockAccounts = [{ id: '1', email: 'test@gmail.com', is_active: true }];
    (safeClient.from as any).mockResolvedValue({ data: mockAccounts, error: null });

    const { result } = renderHook(() => useGmail());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.accounts.length).toBe(1);
    expect(result.current.accounts[0].email).toBe('test@gmail.com');
  });

  it('deve tratar erro ao carregar contas', async () => {
    (safeClient.from as any).mockResolvedValue({ 
      data: null, 
      error: { message: 'Database error' },
      requestId: 'req-123'
    });

    const { result } = renderHook(() => useGmail());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.error?.toLowerCase()).toContain('database error');
    expect(result.current.accounts.length).toBe(0);
  });

  it('deve lidar com retorno de dados vazio', async () => {
    (safeClient.from as any).mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useGmail());

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.accounts.length).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });
});
