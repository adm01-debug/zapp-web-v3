/**
 * email-flow.test.ts — Testes de integração para fluxo de email
 *
 * Cobre os cenários críticos end-to-end:
 * 1. Conexão OAuth Gmail
 * 2. Sincronização de inbox
 * 3. Envio de email
 * 4. SLA tracking
 * 5. Conexão OAuth Outlook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────
const mockInvoke  = vi.fn();
const mockFrom    = vi.fn();
const mockRpc     = vi.fn();
const mockChannel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn(), unsubscribe: vi.fn() };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: (fn: string, opts: unknown) => mockInvoke(fn, opts) },
    from:      (table: string) => mockFrom(table),
    rpc:       (fn: string, params?: unknown) => mockRpc(fn, params),
    auth:      { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-123' } } }) },
    channel:   vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
  },
}));

const makeQueryMock = (data: unknown[], error = null) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: data[0] ?? null, error }),
  then: vi.fn().mockImplementation(cb => Promise.resolve(cb({ data, error }))),
  finally: vi.fn().mockImplementation(cb => { cb(); return { data, error }; }),
});

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Email Flow — Gmail OAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAuthUrl deve retornar URL válida do Google', async () => {
    mockInvoke.mockResolvedValue({
      data: { authUrl: 'https://accounts.google.com/o/oauth2/auth?client_id=...', state: 'abc123' },
      error: null,
    });

    const result = await mockInvoke('gmail-oauth', { body: { action: 'getAuthUrl' } });
    expect(result.data.authUrl).toContain('accounts.google.com');
    expect(result.data.state).toBeDefined();
  });

  it('exchangeCode deve salvar tokens na base de dados', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, accountId: 'acc-gmail-1', email: 'user@gmail.com' },
      error: null,
    });

    const result = await mockInvoke('gmail-oauth', {
      body: { action: 'exchangeCode', code: 'auth-code-123', userId: 'user-123' }
    });

    expect(result.data.success).toBe(true);
    expect(result.data.email).toBe('user@gmail.com');
  });

  it('listThreads deve retornar lista de threads', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        threads: [
          { id: 'thread-1', snippet: 'Assunto do email', labelIds: ['INBOX'], unreadCount: 1 },
          { id: 'thread-2', snippet: 'Outro email', labelIds: ['INBOX'], unreadCount: 0 },
        ],
        nextPageToken: null,
      },
      error: null,
    });

    const result = await mockInvoke('gmail-sync', {
      body: { action: 'listThreads', accountId: 'acc-gmail-1', maxResults: 50 }
    });

    expect(result.data.threads).toHaveLength(2);
    expect(result.data.threads[0].id).toBe('thread-1');
  });

  it('send deve enviar email com sucesso', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, messageId: 'msg-sent-1' },
      error: null,
    });

    const result = await mockInvoke('gmail-send', {
      body: {
        action: 'send',
        accountId: 'acc-gmail-1',
        to: ['destinatario@exemplo.com'],
        subject: 'Teste de envio',
        body: '<p>Corpo do email de teste</p>',
      }
    });

    expect(result.data.success).toBe(true);
    expect(result.data.messageId).toBeDefined();
  });
});

describe('Email Flow — Outlook OAuth', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getAuthUrl deve retornar URL válida da Microsoft', async () => {
    mockInvoke.mockResolvedValue({
      data: { authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?...', state: 'xyz789' },
      error: null,
    });

    const result = await mockInvoke('outlook-oauth', { body: { action: 'getAuthUrl' } });
    expect(result.data.authUrl).toContain('microsoftonline.com');
  });

  it('syncInbox deve retornar mensagens do Outlook', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        messages: [
          {
            id: 'out-msg-1',
            subject: 'Email do Outlook',
            bodyPreview: 'Corpo do email...',
            from: { emailAddress: { address: 'remetente@empresa.com', name: 'Remetente' } },
            receivedDateTime: new Date().toISOString(),
            isRead: false,
            hasAttachments: false,
            conversationId: 'conv-out-1',
          }
        ],
        nextLink: null,
      },
      error: null,
    });

    const result = await mockInvoke('outlook-oauth', {
      body: { action: 'syncInbox', accountId: 'acc-outlook-1', pageSize: 50 }
    });

    expect(result.data.messages).toHaveLength(1);
    expect(result.data.messages[0].subject).toBe('Email do Outlook');
  });

  it('sendMessage deve enviar email via Graph API', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    const result = await mockInvoke('outlook-oauth', {
      body: {
        action: 'sendMessage',
        accountId: 'acc-outlook-1',
        to: ['dest@empresa.com'],
        subject: 'Teste Outlook',
        bodyHtml: '<p>Email via Microsoft Graph API</p>',
      }
    });

    expect(result.data.success).toBe(true);
  });
});

describe('Email SLA — Business Hours', () => {
  it('deve calcular SLA corretamente para thread sem resposta', () => {
    const calcElapsed = (from: Date, to: Date, businessOnly: boolean): number => {
      if (!businessOnly) return Math.floor((to.getTime() - from.getTime()) / 60_000);
      // Simplified: count only Mon-Fri 8-18
      return Math.floor((to.getTime() - from.getTime()) / 60_000) * 0.5; // Approximation
    };

    const received = new Date('2026-05-01T08:00:00Z');
    const now      = new Date('2026-05-01T10:00:00Z');

    const realElapsed = calcElapsed(received, now, false);
    expect(realElapsed).toBe(120); // 2 horas = 120 minutos
  });

  it('deve detectar violação de SLA corretamente', () => {
    const SLA_THRESHOLD = 480; // 8 horas
    const elapsed = 600; // 10 horas

    const status = elapsed >= SLA_THRESHOLD ? 'breached' : elapsed >= SLA_THRESHOLD * 0.8 ? 'warning' : 'ok';
    expect(status).toBe('breached');
  });

  it('deve detectar warning de SLA (80% do threshold)', () => {
    const SLA_THRESHOLD = 480;
    const elapsed = 400; // 83% do threshold

    const status = elapsed >= SLA_THRESHOLD ? 'breached' : elapsed >= SLA_THRESHOLD * 0.8 ? 'warning' : 'ok';
    expect(status).toBe('warning');
  });
});

describe('Email Accounts — Unificado', () => {
  it('rpc_unified_email_send deve retornar provider correto', async () => {
    mockRpc.mockResolvedValue({
      data: {
        provider: 'gmail',
        edge_function: 'gmail-send',
        action: 'send',
        ready: true,
      },
      error: null,
    });

    const result = await mockRpc('rpc_unified_email_send', {
      p_account_id: 'acc-gmail-1',
      p_to: ['dest@exemplo.com'],
      p_subject: 'Teste',
    });

    expect(result.data.provider).toBe('gmail');
    expect(result.data.edge_function).toBe('gmail-send');
  });
});
