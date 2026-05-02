import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeClient } from '../safeClient';

const mockSelect = vi.fn();
const mockRpcChain = vi.fn();

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
      limit: vi.fn().mockImplementation(() => {
        return mockRpcChain();
      }),
      then: (resolve: any) => resolve(mockRpcChain())
    })),
  },
}));

describe('safeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve validar e falhar se uma tabela gmail_* não existir', async () => {
    mockSelect.mockResolvedValue({ error: { message: 'relation "gmail_test" does not exist' } });

    const { data, error } = await safeClient.from('gmail_test_fail', (q) => q.select('*'));

    expect(data).toEqual([]);
    expect(error?.message).toContain('não disponível');
  });

  it('deve retornar dados corretamente em queries seguras', async () => {
    // Usa uma tabela que NÃO começa com gmail_ para pular validação interna
    mockSelect.mockResolvedValue({ data: [{ id: 1 }], error: null });

    const res = await safeClient.from('regular_table', (q) => q.select('*'));
    expect(res.data).toEqual([{ id: 1 }]);
    expect(res.error).toBeNull();
  });

  it('deve incluir requestId em todas as respostas', async () => {
    mockRpcChain.mockResolvedValue({ data: { status: 'ok' }, error: null });
    const { requestId } = await safeClient.rpc('any_rpc');
    expect(requestId).toMatch(/^[a-z0-9]+$/);
  });

  it('deve lidar com retornos malformados (não array em from)', async () => {
    mockSelect.mockResolvedValue({ data: { not: 'an_array' }, error: null });
    const { data } = await safeClient.from('malformed_table', (q) => q.select('*'));
    expect(data).toEqual([]);
  });

  it('deve validar RPCs rpc_gmail_*', async () => {
    mockRpcChain.mockResolvedValue({ error: { message: 'function rpc_gmail_test() does not exist' } });

    const { error } = await safeClient.rpc('rpc_gmail_test_fail');
    expect(error?.message).toContain('não disponível');
  });
});