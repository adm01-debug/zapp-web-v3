import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEmail } from '../useEmail';
import { safeClient } from '@/integrations/supabase/safeClient';
import { supabase } from '@/integrations/supabase/client';

// Mock do safeClient para evitar chamadas reais ao banco
vi.mock('@/integrations/supabase/safeClient', () => ({
  safeClient: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn(),
  }
}));

// Mock do supabase client para Edge Functions e Realtime
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

describe('useEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Configuração padrão de mocks bem-sucedidos
    (safeClient.from as any).mockImplementation(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      then: (resolve: any) => resolve({ data: [], error: null }),
    }));
    
    (safeClient.rpc as any).mockResolvedValue({ data: [], error: null });
  });

  describe('Carregamento de Contas (loadAccounts)', () => {
    it('deve carregar contas com sucesso e definir a conta ativa inicial', async () => {
      const mockAccounts = [
        { id: 'acc-1', email: 'test1@email.com', is_active: true, display_name: 'Test 1' },
        { id: 'acc-2', email: 'test2@email.com', is_active: true, display_name: 'Test 2' }
      ];
      
      (safeClient.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ data: mockAccounts, error: null }),
      }));

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        // Aguarda os useEffects iniciais
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.accounts).toHaveLength(2);
      expect(result.current.activeAccountId).toBe('acc-1');
      expect(result.current.isLoading).toBe(false);
    });

    it('deve usar mocks quando o schema não estiver disponível (fallback funcional)', async () => {
      (safeClient.from as any).mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        then: (resolve: any) => resolve({ error: { message: 'relation "email_accounts" does not exist' } }),
      }));

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.schemaStatus.ok).toBe(false);
      // O hook deve carregar GMAIL_MOCKS.accounts internamente
      expect(result.current.accounts.length).toBeGreaterThan(0);
    });
  });

  describe('Operações de Mensagens (Threads)', () => {
    it('deve carregar threads ao selecionar uma conta ativa', async () => {
      const mockThreads = [
        { id: 'thread-1', subject: 'Assunto 1', snippet: 'Oi...' },
        { id: 'thread-2', subject: 'Assunto 2', snippet: 'Olá...' }
      ];

      (safeClient.rpc as any).mockResolvedValue({ data: mockThreads, error: null });

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        result.current.setActiveAccountId('acc-1');
      });

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(safeClient.rpc).toHaveBeenCalledWith('rpc_email_search_threads', expect.objectContaining({
        p_account_id: 'acc-1'
      }));
      expect(result.current.threads).toHaveLength(2);
    });

    it('deve enviar um email através da Edge Function email-send', async () => {
      (supabase.functions.invoke as any).mockResolvedValue({ data: { success: true }, error: null });
      
      const { result } = renderHook(() => useEmail());

      // Mock de conta ativa para permitir o envio
      await act(async () => {
        result.current.setActiveAccountId('acc-1');
      });

      let response;
      await act(async () => {
        response = await result.current.sendEmail({
          to: 'destinatario@teste.com',
          subject: 'Teste unitário',
          bodyHtml: '<p>Olá mundo</p>'
        });
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('email-send', expect.objectContaining({
        body: expect.objectContaining({
          action: 'send',
          to: ['destinatario@teste.com']
        })
      }));
      expect(response).toEqual({ success: true });
    });
  });

  describe('Gerenciamento de Tokens e Status', () => {
    it('deve verificar o status do token periodicamente', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useEmail());

      await act(async () => {
        vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutos
      });

      expect(safeClient.rpc).toHaveBeenCalledWith('rpc_email_token_status');
      vi.useRealTimers();
    });

    it('deve tratar falha na renovação do token', async () => {
      (supabase.functions.invoke as any).mockResolvedValue({ 
        data: { success: false }, 
        error: new Error('Token refresh failed') 
      });

      const { result } = renderHook(() => useEmail());

      let success;
      await act(async () => {
        success = await result.current.refreshToken('acc-1');
      });

      expect(success).toBe(false);
      expect(result.current.error).toContain('Token expirado');
    });
  });

  describe('Ações de Thread (Star, Archive, Read)', () => {
    it('deve marcar uma thread como lida localmente após sucesso no RPC', async () => {
      const initialThreads = [{ id: 't1', unread_count: 5 }];
      (safeClient.rpc as any).mockResolvedValueOnce({ data: [], error: null }); // Mock load threads
      (safeClient.rpc as any).mockResolvedValueOnce({ data: [], error: null }); // Mock mark read

      const { result } = renderHook(() => useEmail());

      // Injetar threads manualmente no estado para o teste
      await act(async () => {
        (result.current as any).setThreads?.(initialThreads); 
        // Nota: setThreads não é exportado, mas o hook carrega via rpc_email_search_threads
      });

      // Simular carregamento via RPC para o hook popular as threads
      (safeClient.rpc as any).mockResolvedValue({ data: initialThreads, error: null });
      await act(async () => {
        await result.current.setActiveAccountId('acc-1');
      });

      await act(async () => {
        await result.current.markAsRead('t1', true);
      });

      expect(result.current.threads[0].unread_count).toBe(0);
    });

    it('deve remover thread da lista ao arquivar', async () => {
      const initialThreads = [{ id: 't1' }, { id: 't2' }];
      (safeClient.rpc as any).mockResolvedValue({ data: initialThreads, error: null });

      const { result } = renderHook(() => useEmail());

      await act(async () => {
        await result.current.setActiveAccountId('acc-1');
      });

      await act(async () => {
        await result.current.archiveThread('t1');
      });

      expect(result.current.threads).toHaveLength(1);
      expect(result.current.threads[0].id).toBe('t2');
    });
  });
});
