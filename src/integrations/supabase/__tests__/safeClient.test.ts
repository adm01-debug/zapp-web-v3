
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeClient } from '../safeClient';

const mockSelect = vi.fn();
const mockRpc = vi.fn();

vi.mock('../client', () => ({
  supabase: {
    from: vi.fn((table: string) => ({
      select: mockSelect,
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
    rpc: vi.fn((name: string, params: any) => ({
      rpc: mockRpc,
      limit: vi.fn().mockReturnThis(),
    })),
  },
}));

// Re-mock logic to handle both top-level and chained rpc calls
import { supabase as mockSupabase } from '../client';

describe('safeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset cache implicitly by not having persistence between tests if we wanted, 
    // but here we just want to ensure validation logic runs.
  });

  it('deve validar e falhar se uma tabela gmail_* não existir', async () => {
    // Primeira chamada para validateResource (select count)
    mockSelect.mockResolvedValueOnce({ error: { message: 'relation "gmail_test" does not exist' } });

    const { data, error, requestId } = await safeClient.from('gmail_test', (q) => q.select('*'));

    expect(data).toEqual([]);
    expect(error?.message).toContain('não disponível');
    expect(requestId).toBeDefined();
  });

  it('deve usar cache para validações subsequentes', async () => {
    // Mock para a primeira validação (sucesso)
    mockSelect.mockResolvedValueOnce({ error: null }); 
    // Mock para a query real
    mockSelect.mockResolvedValueOnce({ data: [{ id: 1 }], error: null });

    await safeClient.from('gmail_cached', (q) => q.select('*'));
    
    // Segunda chamada não deve chamar o "select count" de validação
    mockSelect.mockResolvedValueOnce({ data: [{ id: 2 }], error: null });
    await safeClient.from('gmail_cached', (q) => q.select('*'));

    // Deve ter chamado select 3 vezes: 1 para validação, 2 para as queries reais
    expect(mockSelect).toHaveBeenCalledTimes(3);
  });

  it('deve incluir requestId em todas as respostas', async () => {
    (mockSupabase.rpc as any).mockResolvedValueOnce({ data: { status: 'ok' }, error: null });
    const { requestId } = await safeClient.rpc('any_rpc');
    expect(requestId).toMatch(/^[a-z0-9]+$/);
  });

  it('deve lidar com retornos malformados (não array em from)', async () => {
    mockSelect.mockResolvedValueOnce({ data: { not: 'an_array' }, error: null });
    const { data } = await safeClient.from('some_table', (q) => q.select('*'));
    expect(data).toEqual([]);
  });

  it('deve validar RPCs rpc_gmail_*', async () => {
    // Mock para validação (limit 0)
    (mockSupabase.rpc as any).mockResolvedValueOnce({ error: { message: 'function rpc_gmail_test() does not exist' } });

    const { error } = await safeClient.rpc('rpc_gmail_test');
    expect(error?.message).toContain('não disponível');
  });
});
