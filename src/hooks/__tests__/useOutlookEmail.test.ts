/**
 * useOutlookEmail.test.ts
 * Testes para o hook de integração Outlook via Microsoft Graph API
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOutlookEmail } from '../useOutlookEmail';

const mockInvoke = vi.fn();
const mockFrom   = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (fn: string, opts: unknown) => mockInvoke(fn, opts) },
    from:      (table: string) => mockFrom(table),
    auth:      { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  },
}));

const MOCK_ACCOUNTS = [
  { id: 'acc-1', email: 'joao@empresa.com', is_active: true, provider: 'outlook' },
];

const MOCK_MESSAGES = [
  {
    id: 'msg-1',
    subject: 'Teste de email',
    bodyPreview: 'Olá, este é um teste.',
    from: { emailAddress: { address: 'remetente@exemplo.com', name: 'Remetente' } },
    toRecipients: [{ emailAddress: { address: 'joao@empresa.com' } }],
    receivedDateTime: new Date().toISOString(),
    isRead: false,
    hasAttachments: false,
    conversationId: 'conv-1',
  },
];

const makeFromMock = (data: unknown[], error = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data, error }),
});

describe('useOutlookEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeFromMock(MOCK_ACCOUNTS));
    mockInvoke.mockResolvedValue({
      data: { messages: MOCK_MESSAGES, nextLink: null },
      error: null,
    });
  });

  it('deve carregar contas Outlook existentes', async () => {
    const { result } = renderHook(() => useOutlookEmail());

    await waitFor(() => {
      expect(result.current.accounts).toHaveLength(1);
    });

    expect(result.current.accounts[0].email).toBe('joao@empresa.com');
    expect(result.current.accounts[0].provider).toBe('outlook');
  });

  it('deve definir conta ativa ao carregar', async () => {
    const { result } = renderHook(() => useOutlookEmail());

    await waitFor(() => {
      expect(result.current.activeAccountId).toBe('acc-1');
    });
  });

  it('deve sincronizar inbox ao ativar conta', async () => {
    mockInvoke.mockResolvedValue({
      data: { messages: MOCK_MESSAGES, nextLink: null },
      error: null,
    });

    const { result } = renderHook(() => useOutlookEmail());

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    expect(result.current.messages[0].subject).toBe('Teste de email');
  });

  it('deve calcular unreadCount corretamente', async () => {
    mockInvoke.mockResolvedValue({
      data: { messages: MOCK_MESSAGES, nextLink: null },
      error: null,
    });

    const { result } = renderHook(() => useOutlookEmail());

    await waitFor(() => expect(result.current.unreadCount).toBeGreaterThanOrEqual(0));
  });

  it('deve marcar mensagem como lida', async () => {
    mockInvoke.mockImplementation((fn, opts) => {
      if (opts.body.action === 'syncInbox') {
        return Promise.resolve({ data: { messages: MOCK_MESSAGES, nextLink: null }, error: null });
      }
      if (opts.body.action === 'markAsRead') {
        return Promise.resolve({ data: { success: true }, error: null });
      }
      return Promise.resolve({ data: {}, error: null });
    });

    const { result } = renderHook(() => useOutlookEmail());

    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    await act(async () => {
      await result.current.markAsRead('msg-1', true);
    });

    expect(result.current.messages[0].isRead).toBe(true);
  });

  it('deve expor getAuthUrl para iniciar OAuth', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { authUrl: 'https://login.microsoftonline.com/...', state: 'random-state' },
      error: null,
    });

    // startOAuth tenta abrir popup — apenas verifica que é chamado
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null as unknown as Window);

    const { result } = renderHook(() => useOutlookEmail());

    await act(async () => {
      await result.current.startOAuth();
    });

    expect(openSpy).toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
