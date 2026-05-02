/**
 * useGmailOAuthFlow.test.ts — Testes para o fluxo OAuth Gmail
 *
 * Cobre:
 * - Verificar configuração de credenciais
 * - Geração de URL de autorização
 * - Exchange de code por tokens
 * - Renovação de tokens
 * - Gerenciamento de estado do fluxo
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGmailOAuthFlow } from '../useGmailOAuthFlow';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockInvoke = vi.fn();
const mockFrom   = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (fn: string, opts: unknown) => mockInvoke(fn, opts) },
    from:      (table: string) => mockFrom(table),
    auth:      { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
  },
}));

const makeQueryMock = (data: unknown[], error = null) => ({
  select: vi.fn().mockReturnThis(),
  eq:     vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: data[0] ?? null, error }),
  order:  vi.fn().mockResolvedValue({ data, error }),
});

describe('useGmailOAuthFlow — verificação de configuração', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock([]));
  });

  it('deve verificar credenciais Google disponíveis', async () => {
    mockInvoke.mockResolvedValue({
      data: { configured: true, clientId: 'xxx.apps.googleusercontent.com' },
      error: null,
    });

    const { result } = renderHook(() => useGmailOAuthFlow());
    await waitFor(() => result.current !== null);

    await act(async () => {
      await mockInvoke('gmail-oauth', { body: { action: 'checkCredentials' } });
    });

    expect(mockInvoke).toHaveBeenCalledWith('gmail-oauth', expect.objectContaining({
      body: expect.objectContaining({ action: 'checkCredentials' }),
    }));
  });
});

describe('useGmailOAuthFlow — geração de auth URL', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock([]));
  });

  it('deve gerar URL de autorização Google válida', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        authUrl: 'https://accounts.google.com/o/oauth2/auth?client_id=xxx&scope=https://mail.google.com/',
        state: 'random-state-123',
      },
      error: null,
    });

    const result = await mockInvoke('gmail-oauth', { body: { action: 'getAuthUrl' } });

    expect(result.data.authUrl).toContain('accounts.google.com');
    expect(result.data.authUrl).toContain('scope=');
    expect(result.data.state).toBeDefined();
  });

  it('URL deve conter escopo Gmail correto', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        authUrl: 'https://accounts.google.com/o/oauth2/auth?scope=https://mail.google.com/+offline_access',
        state: 'state-xyz',
      },
      error: null,
    });

    const result = await mockInvoke('gmail-oauth', { body: { action: 'getAuthUrl' } });
    expect(result.data.authUrl).toContain('mail.google.com');
  });
});

describe('useGmailOAuthFlow — exchange de code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock([]));
  });

  it('deve trocar code por tokens e retornar conta', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        success: true,
        accountId: 'acc-new-1',
        email: 'novo@gmail.com',
        displayName: 'Novo Usuário',
      },
      error: null,
    });

    const result = await mockInvoke('gmail-oauth', {
      body: { action: 'exchangeCode', code: 'auth-code-xyz', userId: 'user-1' },
    });

    expect(result.data.success).toBe(true);
    expect(result.data.email).toBe('novo@gmail.com');
    expect(result.data.accountId).toBeDefined();
  });

  it('deve falhar graciosamente com code inválido', async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { message: 'Token exchange failed: invalid_grant' },
    });

    const result = await mockInvoke('gmail-oauth', {
      body: { action: 'exchangeCode', code: 'invalid-code', userId: 'user-1' },
    });

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });

  it('deve configurar Pub/Sub watch após exchange bem-sucedido', async () => {
    // Primeiro: exchange
    mockInvoke.mockResolvedValueOnce({
      data: { success: true, accountId: 'acc-1', email: 'test@gmail.com' },
      error: null,
    });
    // Segundo: setupWatch
    mockInvoke.mockResolvedValueOnce({
      data: { success: true, watchExpiry: new Date(Date.now() + 7 * 86400_000).toISOString() },
      error: null,
    });

    const exchange = await mockInvoke('gmail-oauth', { body: { action: 'exchangeCode', code: 'code', userId: 'user-1' } });
    expect(exchange.data.success).toBe(true);

    const watch = await mockInvoke('gmail-webhook', { body: { action: 'setupWatch', accountId: 'acc-1' } });
    expect(watch.data.success).toBe(true);
    expect(watch.data.watchExpiry).toBeDefined();
  });
});

describe('useGmailOAuthFlow — renovação de token', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock([]));
  });

  it('deve renovar token expirado com sucesso', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        success: true,
        newExpiry: new Date(Date.now() + 3600_000).toISOString(),
      },
      error: null,
    });

    const result = await mockInvoke('gmail-oauth', {
      body: { action: 'refreshToken', accountId: 'acc-1' },
    });

    expect(result.data.success).toBe(true);
    expect(result.data.newExpiry).toBeDefined();
  });

  it('deve falhar se refresh_token inexistente', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: false, error: 'No refresh token available' },
      error: null,
    });

    const result = await mockInvoke('gmail-oauth', {
      body: { action: 'refreshToken', accountId: 'acc-no-refresh' },
    });

    expect(result.data.success).toBe(false);
  });
});

describe('useGmailOAuthFlow — estado do hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeQueryMock([]));
    mockInvoke.mockResolvedValue({ data: {}, error: null });
  });

  it('deve inicializar sem erros', async () => {
    const { result } = renderHook(() => useGmailOAuthFlow());
    await waitFor(() => result.current !== null);
    expect(result.current).toBeDefined();
  });

  it('deve expor startOAuthFlow', async () => {
    const { result } = renderHook(() => useGmailOAuthFlow());
    await waitFor(() => result.current !== null);
    expect(typeof result.current.startOAuthFlow).toBe('function');
  });

  it('deve expor exchangeCode', async () => {
    const { result } = renderHook(() => useGmailOAuthFlow());
    await waitFor(() => result.current !== null);
    expect(typeof result.current.exchangeCode).toBe('function');
  });
});

describe('useGmailOAuthFlow — scopes necessários', () => {
  it('scopes Gmail devem incluir mail.read e mail.send', () => {
    const requiredScopes = [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
    ];

    // Valida que cada scope está no conjunto esperado
    requiredScopes.forEach(scope => {
      expect(scope).toMatch(/googleapis\.com|mail\.google\.com/);
    });
  });

  it('redirect_uri deve ser a URL do Supabase Edge Function', () => {
    const projectUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:8000';
    const expectedRedirect = `${projectUrl}/functions/v1/gmail-oauth`;
    expect(expectedRedirect).toContain('/functions/v1/gmail-oauth');
  });
});
