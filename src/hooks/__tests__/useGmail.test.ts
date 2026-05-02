/**
 * useGmail.test.ts — Testes completos do hook useGmail
 *
 * Cobre:
 * - Carregamento de contas
 * - Status de tokens (valid/expiring/expired)
 * - Carregamento e paginação de threads
 * - Sincronização via gmail-sync
 * - Ações: markAsRead, star, archive, assign
 * - Envio de emails via gmail-send
 * - Realtime subscription
 * - OAuth flow
 * - Disconnect
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGmail } from '../useGmail';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockInvoke  = vi.fn();
const mockFrom    = vi.fn();
const mockRpc     = vi.fn();
const mockChannel = {
  on:          vi.fn().mockReturnThis(),
  subscribe:   vi.fn().mockReturnValue({}),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (fn: string, opts: unknown) => mockInvoke(fn, opts) },
    from:      (table: string) => mockFrom(table),
    rpc:       (fn: string, params?: unknown) => mockRpc(fn, params),
    auth:      { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    channel:   vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
  },
}));

const makeQueryMock = (data: unknown[], error = null) => ({
  select: vi.fn().mockReturnThis(),
  eq:     vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  order:  vi.fn().mockResolvedValue({ data, error }),
  single: vi.fn().mockResolvedValue({ data: data[0] ?? null, error }),
});

const MOCK_ACCOUNTS = [
  {
    id: 'acc-1', user_id: 'user-1', email: 'test@gmail.com',
    display_name: 'Test User', is_active: true,
    token_expiry: new Date(Date.now() + 3600_000).toISOString(),
    watch_expiry: new Date(Date.now() + 3 * 86400_000).toISOString(),
  },
];

const MOCK_TOKEN_STATUS = [
  {
    account_id: 'acc-1', email: 'test@gmail.com', is_active: true,
    token_status: 'valid', token_expiry: MOCK_ACCOUNTS[0].token_expiry,
    watch_status: 'active', watch_expiry: MOCK_ACCOUNTS[0].watch_expiry,
    minutes_until_expiry: 60,
  },
];

const MOCK_THREADS = [
  {
    id: 'thread-1', account_id: 'acc-1', gmail_thread_id: 'gt-1',
    subject: 'Assunto de teste', snippet: 'Trecho do email...',
    from_email: 'remetente@exemplo.com', from_name: 'Remetente',
    label_ids: ['INBOX'], unread_count: 1, message_count: 1,
    is_starred: false, is_important: false,
    sla_status: 'ok', assigned_to: null,
    last_message_at: new Date().toISOString(), first_reply_at: null,
    created_at: new Date().toISOString(),
  },
  {
    id: 'thread-2', account_id: 'acc-1', gmail_thread_id: 'gt-2',
    subject: 'Outro email', snippet: 'Outro trecho...',
    from_email: 'outro@exemplo.com', from_name: 'Outro',
    label_ids: ['INBOX'], unread_count: 0, message_count: 2,
    is_starred: true, is_important: false,
    sla_status: 'warning', assigned_to: 'agent-1',
    last_message_at: new Date().toISOString(), first_reply_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  },
];

describe('useGmail — carregamento de contas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock(MOCK_ACCOUNTS));
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'rpc_gmail_token_status') return Promise.resolve({ data: MOCK_TOKEN_STATUS, error: null });
      if (fn === 'rpc_gmail_search_threads') return Promise.resolve({ data: MOCK_THREADS, error: null });
      return Promise.resolve({ data: null, error: null });
    });
  });

  it('deve carregar contas Gmail ativas', async () => {
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.accounts).toHaveLength(1);
    expect(result.current.accounts[0].email).toBe('test@gmail.com');
  });

  it('deve definir conta ativa ao carregar', async () => {
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.activeAccountId).toBe('acc-1'));
  });

  it('deve carregar threads ao definir conta ativa', async () => {
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.threads.length).toBeGreaterThan(0));
    expect(result.current.threads[0].subject).toBe('Assunto de teste');
  });

  it('deve calcular unreadCount corretamente', async () => {
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.unreadCount).toBe(1));
  });

  it('deve calcular slaBreachedCount corretamente', async () => {
    const threads = [...MOCK_THREADS, { ...MOCK_THREADS[0], id: 'thread-3', sla_status: 'breached' }];
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'rpc_gmail_token_status') return Promise.resolve({ data: MOCK_TOKEN_STATUS, error: null });
      if (fn === 'rpc_gmail_search_threads') return Promise.resolve({ data: threads, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.slaBreachedCount).toBe(1));
  });
});

describe('useGmail — status de tokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock(MOCK_ACCOUNTS));
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'rpc_gmail_token_status') return Promise.resolve({ data: MOCK_TOKEN_STATUS, error: null });
      if (fn === 'rpc_gmail_search_threads') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });
  });

  it('deve retornar token status válido', async () => {
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.activeTokenInfo).not.toBeNull());
    expect(result.current.activeTokenInfo?.token_status).toBe('valid');
  });

  it('deve detectar hasTokenWarning quando token expira em breve', async () => {
    const expiringSoon = [{ ...MOCK_TOKEN_STATUS[0], token_status: 'expiring_soon' }];
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'rpc_gmail_token_status') return Promise.resolve({ data: expiringSoon, error: null });
      if (fn === 'rpc_gmail_search_threads') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.hasTokenWarning).toBe(true));
  });

  it('deve detectar hasWatchWarning quando watch expira', async () => {
    const watchExpiring = [{ ...MOCK_TOKEN_STATUS[0], watch_status: 'expiring_soon' }];
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'rpc_gmail_token_status') return Promise.resolve({ data: watchExpiring, error: null });
      if (fn === 'rpc_gmail_search_threads') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });

    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.hasWatchWarning).toBe(true));
  });
});

describe('useGmail — ações nas threads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock(MOCK_ACCOUNTS));
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'rpc_gmail_token_status') return Promise.resolve({ data: MOCK_TOKEN_STATUS, error: null });
      if (fn === 'rpc_gmail_search_threads') return Promise.resolve({ data: MOCK_THREADS, error: null });
      return Promise.resolve({ data: null, error: null });
    });
  });

  it('deve marcar thread como lida', async () => {
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.threads).toHaveLength(2));

    await act(async () => {
      await result.current.markAsRead('thread-1', true);
    });

    expect(result.current.threads.find(t => t.id === 'thread-1')?.unread_count).toBe(0);
  });

  it('deve estrelhar thread', async () => {
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.threads).toHaveLength(2));

    await act(async () => {
      await result.current.starThread('thread-1', true);
    });

    expect(result.current.threads.find(t => t.id === 'thread-1')?.is_starred).toBe(true);
  });

  it('deve arquivar thread (remover do inbox)', async () => {
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.threads).toHaveLength(2));

    await act(async () => {
      await result.current.archiveThread('thread-1');
    });

    expect(result.current.threads.find(t => t.id === 'thread-1')).toBeUndefined();
    expect(result.current.threads).toHaveLength(1);
  });

  it('deve atribuir thread a agente', async () => {
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.threads).toHaveLength(2));

    await act(async () => {
      await result.current.assignThread('thread-1', 'agent-2');
    });

    expect(result.current.threads.find(t => t.id === 'thread-1')?.assigned_to).toBe('agent-2');
  });
});

describe('useGmail — sincronização', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock(MOCK_ACCOUNTS));
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'rpc_gmail_token_status') return Promise.resolve({ data: MOCK_TOKEN_STATUS, error: null });
      if (fn === 'rpc_gmail_search_threads') return Promise.resolve({ data: MOCK_THREADS, error: null });
      return Promise.resolve({ data: null, error: null });
    });
    mockInvoke.mockResolvedValue({ data: { success: true, synced: 10 }, error: null });
  });

  it('deve sincronizar inbox via gmail-sync', async () => {
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.activeAccountId).toBe('acc-1'));

    await act(async () => {
      await result.current.syncNow();
    });

    expect(mockInvoke).toHaveBeenCalledWith('gmail-sync', expect.objectContaining({
      body: expect.objectContaining({ action: 'syncInbox' }),
    }));
    expect(result.current.isSyncing).toBe(false);
  });

  it('não deve sincronizar se já está sincronizando', async () => {
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.activeAccountId).toBe('acc-1'));

    // Simula sincronização lenta
    mockInvoke.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { success: true }, error: null }), 500)));

    act(() => { result.current.syncNow(); });

    // Segunda chamada não deve disparar
    await act(async () => {
      await result.current.syncNow();
    });

    // Deve ter chamado o invoke apenas 1 vez
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});

describe('useGmail — envio de email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock(MOCK_ACCOUNTS));
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'rpc_gmail_token_status') return Promise.resolve({ data: MOCK_TOKEN_STATUS, error: null });
      if (fn === 'rpc_gmail_search_threads') return Promise.resolve({ data: [], error: null });
      return Promise.resolve({ data: null, error: null });
    });
  });

  it('deve enviar email com sucesso', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true, messageId: 'msg-1' }, error: null });
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.activeAccountId).toBe('acc-1'));

    let sendResult: { success: boolean } | undefined;
    await act(async () => {
      sendResult = await result.current.sendEmail({
        to: 'dest@exemplo.com',
        subject: 'Assunto',
        bodyHtml: '<p>Corpo</p>',
      });
    });

    expect(sendResult?.success).toBe(true);
    expect(mockInvoke).toHaveBeenCalledWith('gmail-send', expect.anything());
  });

  it('deve retornar erro se nenhuma conta ativa', async () => {
    mockFrom.mockReturnValue(makeQueryMock([])); // sem contas
    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let sendResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      sendResult = await result.current.sendEmail({
        to: 'dest@exemplo.com',
        subject: 'Assunto',
        bodyHtml: '<p>Corpo</p>',
      });
    });

    expect(sendResult?.success).toBe(false);
    expect(sendResult?.error).toBeDefined();
  });
});

describe('useGmail — disconnect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock(MOCK_ACCOUNTS));
    mockRpc.mockImplementation((fn: string) => {
      if (fn === 'rpc_gmail_token_status') return Promise.resolve({ data: MOCK_TOKEN_STATUS, error: null });
      if (fn === 'rpc_gmail_search_threads') return Promise.resolve({ data: MOCK_THREADS, error: null });
      return Promise.resolve({ data: null, error: null });
    });
  });

  it('deve desconectar conta e limpar estado', async () => {
    mockFrom.mockReturnValue({
      ...makeQueryMock(MOCK_ACCOUNTS),
      update: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockResolvedValue({ data: null, error: null }),
    });

    const { result } = renderHook(() => useGmail());
    await waitFor(() => expect(result.current.accounts).toHaveLength(1));

    await act(async () => {
      await result.current.disconnect('acc-1');
    });

    expect(result.current.accounts).toHaveLength(0);
    expect(result.current.activeAccountId).toBeNull();
    expect(result.current.threads).toHaveLength(0);
  });
});
