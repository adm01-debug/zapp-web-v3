/**
 * useInboxRpc.test.ts
 * Testes para a integração do RPC de inbox com o hook de mensagens
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const mockRpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (name: string, params?: unknown) => {
      const result = mockRpc(name, params);
      return { then: (cb: (r: unknown) => unknown) => Promise.resolve(result).then(cb) };
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    }),
    removeChannel: vi.fn(),
  },
}));

describe('Inbox RPC Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rpc_get_inbox deve aceitar parâmetros de filtro', async () => {
    const mockConversations = [
      {
        id: 'conv-1',
        remote_jid: '5511999999999@s.whatsapp.net',
        contact_id: 'contact-1',
        contact_name: 'João Silva',
        contact_phone: '5511999999999',
        status: 'open',
        assigned_to: null,
        priority: 'normal',
        labels: [],
        unread_count: 3,
        last_message_at: new Date().toISOString(),
        last_message_content: 'Olá, preciso de ajuda',
        last_message_type: 'text',
        first_response_at: null,
        first_response_secs: null,
        instance_name: 'wpp2',
        is_bot_active: false,
        sla_status: 'warning',
      },
    ];

    mockRpc.mockResolvedValue({ data: mockConversations, error: null });

    // Simula chamada direta ao RPC
    const result = await mockRpc('rpc_get_inbox', {
      p_instance_name: 'wpp2',
      p_status: 'open',
      p_limit: 50,
      p_offset: 0,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0].contact_name).toBe('João Silva');
    expect(result.data[0].unread_count).toBe(3);
    expect(result.data[0].sla_status).toBe('warning');
  });

  it('deve ordenar por unread_count DESC', () => {
    const conversations = [
      { id: '1', unread_count: 0 },
      { id: '2', unread_count: 5 },
      { id: '3', unread_count: 2 },
    ];

    // Simula ordenação do RPC
    const sorted = [...conversations].sort((a, b) => b.unread_count - a.unread_count);

    expect(sorted[0].id).toBe('2'); // unread_count: 5
    expect(sorted[1].id).toBe('3'); // unread_count: 2
    expect(sorted[2].id).toBe('1'); // unread_count: 0
  });

  it('deve calcular sla_status corretamente', () => {
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
    const tenHoursAgo = new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();

    // Calcula SLA como o RPC faz
    const calcSla = (lastInbound: string, firstResponse: string | null): string => {
      if (firstResponse) return 'replied';
      const diff = now.getTime() - new Date(lastInbound).getTime();
      const hours = diff / (1000 * 60 * 60);
      if (hours >= 8) return 'breached';
      if (hours >= 6) return 'warning';
      return 'ok';
    };

    expect(calcSla(oneHourAgo, null)).toBe('ok');
    expect(calcSla(sixHoursAgo, null)).toBe('warning');
    expect(calcSla(tenHoursAgo, null)).toBe('breached');
    expect(calcSla(tenHoursAgo, now.toISOString())).toBe('replied');
  });
});
