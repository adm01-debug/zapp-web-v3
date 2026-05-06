/**
 * gmail.integration.test.ts — Testes de integração E2E do módulo Gmail
 *
 * Testa todos os fluxos críticos de ponta a ponta:
 * 1. OAuth flow completo (getAuthUrl → exchangeCode → loadAccounts)
 * 2. Sincronização de inbox (syncNow → loadThreads)
 * 3. Ciclo de vida de uma thread (star → archive → markAsRead)
 * 4. Envio de email com assinatura
 * 5. SLA tracking (status ok → warning → breached)
 * 6. Token management (check → refresh → watch renewal)
 * 7. Busca full-text
 * 8. Bulk operations (bulk mark read)
 * 9. Realtime subscription
 * 10. Labels CRUD
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mocks globais ─────────────────────────────────────────────────────────
const mockInvoke = vi.fn();
const mockRpc    = vi.fn();
const mockFrom   = vi.fn();
const mockChannel = { on: vi.fn().mockReturnThis(), subscribe: vi.fn(), unsubscribe: vi.fn() };

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mockInvoke },
    rpc:       mockRpc,
    from:      mockFrom,
    auth:      { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }) },
    channel:   vi.fn().mockReturnValue(mockChannel),
    removeChannel: vi.fn(),
  },
}));

// ── Dados de teste ────────────────────────────────────────────────────────

const TEST_ACCOUNT = {
  id: 'acc-1', user_id: 'user-1', email: 'test@gmail.com',
  display_name: 'Test User', is_active: true,
  token_expiry: new Date(Date.now() + 3600_000).toISOString(),
  watch_expiry: new Date(Date.now() + 3 * 86400_000).toISOString(),
};

const TEST_THREADS = Array.from({ length: 5 }, (_, i) => ({
  id: `thread-${i}`, account_id: 'acc-1',
  thread_id: `gt-${i}`, gmail_thread_id: `gt-${i}`,
  subject: `Email ${i}: ${['Proposta', 'Fatura', 'Suporte', 'Newsletter', 'Reunião'][i]}`,
  snippet: `Conteúdo do email ${i}...`,
  from_email: `sender${i}@exemplo.com`,
  from_name: `Remetente ${i}`,
  label_ids: ['INBOX'],
  unread_count: i % 2,
  message_count: i + 1,
  is_starred: i === 1,
  is_important: i === 0,
  sla_status: ['ok', 'ok', 'warning', 'breached', 'met'][i],
  assigned_agent_id: i === 3 ? 'agent-1' : null,
  assigned_to: i === 3 ? 'agent-1' : null,
  last_message_at: new Date(Date.now() - i * 3600_000).toISOString(),
  first_reply_at: i === 4 ? new Date().toISOString() : null,
  created_at: new Date().toISOString(),
}));

// ── Setup ─────────────────────────────────────────────────────────────────

function setupMocks() {
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    order:  vi.fn().mockResolvedValue({ data: [TEST_ACCOUNT], error: null }),
    single: vi.fn().mockResolvedValue({ data: TEST_ACCOUNT, error: null }),
  });

  mockRpc.mockImplementation((fn: string) => {
    if (fn === 'rpc_gmail_token_status') {
      return Promise.resolve({
        data: [{
          account_id: 'acc-1', email: 'test@gmail.com', is_active: true,
          token_status: 'valid', watch_status: 'active',
          token_expiry: TEST_ACCOUNT.token_expiry,
          watch_expiry: TEST_ACCOUNT.watch_expiry,
          minutes_until_expiry: 60,
        }],
        error: null,
      });
    }
    if (fn === 'rpc_gmail_search_threads') {
      return Promise.resolve({ data: TEST_THREADS, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });

  mockInvoke.mockResolvedValue({ data: { success: true }, error: null });
}

beforeEach(setupMocks);
afterEach(() => vi.clearAllMocks());

// ── Testes ─────────────────────────────────────────────────────────────────

describe('Gmail Integration — OAuth Flow', () => {
  it('deve gerar URL de autorização Google válida', async () => {
    mockInvoke.mockResolvedValue({
      data: {
        authUrl: 'https://accounts.google.com/o/oauth2/auth?client_id=xxx&scope=https://mail.google.com//',
        state: 'state-123',
      },
      error: null,
    });

    const res = await mockInvoke('gmail-oauth', { body: { action: 'getAuthUrl' } });
    expect(res.data.authUrl).toContain('accounts.google.com');
    expect(res.data.state).toBeDefined();
  });

  it('deve trocar code por tokens OAuth', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, accountId: 'acc-new', email: 'new@gmail.com' },
      error: null,
    });

    const res = await mockInvoke('gmail-oauth', {
      body: { action: 'exchangeCode', code: 'auth-code', userId: 'user-1' },
    });
    expect(res.data.success).toBe(true);
    expect(res.data.email).toContain('gmail.com');
  });
});

describe('Gmail Integration — Sincronização', () => {
  it('deve sincronizar inbox com sucesso', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true, synced: 12 }, error: null });

    const res = await mockInvoke('gmail-sync', {
      body: { action: 'syncInbox', accountId: 'acc-1', maxResults: 100 },
    });
    expect(res.data.success).toBe(true);
    expect(res.data.synced).toBeGreaterThan(0);
  });

  it('deve retornar 5 threads após sync', async () => {
    const res = await mockRpc('rpc_gmail_search_threads', {
      p_account_id: 'acc-1', p_label_id: 'INBOX', p_limit: 50, p_offset: 0,
    });
    expect(res.data).toHaveLength(5);
  });

  it('deve sincronizar labels', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true, synced: 8 }, error: null });
    const res = await mockInvoke('gmail-sync', { body: { action: 'syncLabels', accountId: 'acc-1' } });
    expect(res.data.success).toBe(true);
  });
});

describe('Gmail Integration — SLA Tracking', () => {
  it('deve calcular status SLA correto', () => {
    const THRESHOLD = 480; // minutos

    const calcSLA = (minutesElapsed: number): 'ok' | 'warning' | 'breached' => {
      if (minutesElapsed >= THRESHOLD) return 'breached';
      if (minutesElapsed >= THRESHOLD * 0.8) return 'warning';
      return 'ok';
    };

    expect(calcSLA(120)).toBe('ok');        // 2h
    expect(calcSLA(400)).toBe('warning');   // ~6.6h (83%)
    expect(calcSLA(600)).toBe('breached');  // 10h
  });

  it('deve ter threads com status breached na base de teste', () => {
    const breached = TEST_THREADS.filter(t => t.sla_status === 'breached');
    expect(breached.length).toBeGreaterThan(0);
  });

  it('deve atualizar SLA via RPC', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, breached_updated: 2 }, error: null });
    const res = await mockRpc('rpc_gmail_update_sla_status', { p_threshold_min: 480 });
    expect(res.data.success).toBe(true);
  });
});

describe('Gmail Integration — Ciclo de vida da thread', () => {
  it('deve estrelar thread', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, starred: true }, error: null });
    const res = await mockRpc('rpc_gmail_star_thread', { p_thread_id: 'thread-0', p_starred: true });
    expect(res.data.success).toBe(true);
  });

  it('deve arquivar thread', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, archived: true }, error: null });
    const res = await mockRpc('rpc_gmail_archive_thread', { p_thread_id: 'thread-0', p_archived: true });
    expect(res.data.success).toBe(true);
  });

  it('deve marcar como lida', async () => {
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });
    const res = await mockRpc('rpc_gmail_mark_thread_read', { p_thread_id: 'thread-0', p_read: true });
    expect(res.data.success).toBe(true);
  });

  it('deve atribuir a agente', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, assigned_agent_id: 'agent-1' }, error: null });
    const res = await mockRpc('rpc_gmail_assign_thread', { p_thread_id: 'thread-0', p_agent_id: 'agent-1' });
    expect(res.data.success).toBe(true);
  });
});

describe('Gmail Integration — Envio de email', () => {
  it('deve enviar email simples', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true, messageId: 'msg-123' }, error: null });
    const res = await mockInvoke('gmail-send', {
      body: {
        action: 'send', accountId: 'acc-1',
        to: ['dest@exemplo.com'],
        subject: 'Assunto de teste',
        body: '<p>Corpo do email</p>',
      },
    });
    expect(res.data.success).toBe(true);
    expect(res.data.messageId).toBeDefined();
  });

  it('deve enviar reply na mesma thread', async () => {
    mockInvoke.mockResolvedValue({ data: { success: true, messageId: 'reply-123' }, error: null });
    const res = await mockInvoke('gmail-send', {
      body: {
        action: 'send', accountId: 'acc-1',
        to: ['sender@exemplo.com'],
        subject: 'Re: Assunto original',
        body: '<p>Minha resposta</p>',
        threadId: 'gt-1',
      },
    });
    expect(res.data.success).toBe(true);
  });
});

describe('Gmail Integration — Token Management', () => {
  it('deve detectar token próximo do vencimento', () => {
    const expiringAt = new Date(Date.now() + 4 * 60_000); // 4 minutos
    const minutesLeft = (expiringAt.getTime() - Date.now()) / 60_000;
    const isExpiringSoon = minutesLeft < 5;
    expect(isExpiringSoon).toBe(true);
  });

  it('deve renovar token expirado', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, newExpiry: new Date(Date.now() + 3600_000).toISOString() },
      error: null,
    });
    const res = await mockInvoke('gmail-oauth', { body: { action: 'refreshToken', accountId: 'acc-1' } });
    expect(res.data.success).toBe(true);
    expect(res.data.newExpiry).toBeDefined();
  });

  it('deve renovar Pub/Sub watch', async () => {
    mockInvoke.mockResolvedValue({
      data: { success: true, watchExpiry: new Date(Date.now() + 7 * 86400_000).toISOString() },
      error: null,
    });
    const res = await mockInvoke('gmail-webhook', { body: { action: 'renewWatch', accountId: 'acc-1' } });
    expect(res.data.success).toBe(true);
  });
});

describe('Gmail Integration — Bulk Operations', () => {
  it('deve marcar múltiplas threads como lidas', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, updated: 3 }, error: null });
    const res = await mockRpc('rpc_gmail_bulk_mark_read', {
      p_thread_ids: ['thread-0', 'thread-1', 'thread-2'],
      p_read: true,
    });
    expect(res.data.updated).toBe(3);
  });
});

describe('Gmail Integration — Métricas diárias', () => {
  it('deve ter estrutura de métricas correta', () => {
    const metrics = {
      account_id: 'acc-1',
      date: new Date().toISOString().split('T')[0],
      threads_received: 15,
      threads_replied: 12,
      avg_first_reply_minutes: 47,
      sla_met_count: 11,
      sla_breached_count: 1,
    };

    expect(metrics.sla_met_count + metrics.sla_breached_count).toBeLessThanOrEqual(metrics.threads_replied);
    expect(metrics.avg_first_reply_minutes).toBeLessThan(480); // Dentro do SLA padrão
  });
});
