import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEmailAccounts } from '../useEmailAccounts';

// Mock do Supabase definido de forma que possamos alterar o comportamento nos testes
const mockQueryResult = {
  data: [] as any[],
  error: null as any
};

vi.mock('@/integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(() => Promise.resolve({ 
          data: mockQueryResult.data, 
          error: mockQueryResult.error 
        })),
      })),
      channel: vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }),
      removeChannel: vi.fn(),
    },
  };
});

const MOCK_ACCOUNTS = [
  {
    account_id: 'gmail-1',
    user_id: 'user-1',
    email: 'joao@gmail.com',
    display_name: 'João Silva',
    provider: 'gmail',
    auth_method: 'Google OAuth2',
    is_active: true,
    token_expired: false,
    unread_threads: 3,
    sla_breached: 0,
    created_at: new Date().toISOString(),
  },
  {
    account_id: 'outlook-1',
    user_id: 'user-1',
    email: 'joao@empresa.com',
    display_name: 'joao@empresa.com',
    provider: 'outlook',
    auth_method: 'Microsoft Graph API',
    is_active: true,
    token_expired: false,
    unread_threads: 5,
    sla_breached: 1,
    created_at: new Date().toISOString(),
  },
];

describe('useEmailAccounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult.data = [...MOCK_ACCOUNTS];
    mockQueryResult.error = null;
  });

  it('deve carregar contas Gmail e Outlook', async () => {
    const { result } = renderHook(() => useEmailAccounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.hasGmail).toBe(true);
    expect(result.current.hasOutlook).toBe(true);
  });

  it('deve calcular totalUnread corretamente', async () => {
    const { result } = renderHook(() => useEmailAccounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.totalUnread).toBe(8);
  });

  it('deve retornar hasGmail=false quando não há contas Gmail', async () => {
    mockQueryResult.data = [MOCK_ACCOUNTS[1]];
    const { result } = renderHook(() => useEmailAccounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasGmail).toBe(false);
    expect(result.current.hasOutlook).toBe(true);
  });

  it('deve retornar hasOutlook=false quando não há contas Outlook', async () => {
    mockQueryResult.data = [MOCK_ACCOUNTS[0]];
    const { result } = renderHook(() => useEmailAccounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasGmail).toBe(true);
    expect(result.current.hasOutlook).toBe(false);
  });

  it('deve lidar com lista vazia', async () => {
    mockQueryResult.data = [];
    const { result } = renderHook(() => useEmailAccounts());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.accounts).toEqual([]);
    expect(result.current.totalUnread).toBe(0);
  });
});
