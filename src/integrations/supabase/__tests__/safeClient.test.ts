import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeClient, resourceCache } from '../safeClient';

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

describe('safeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resourceCache.clear();
  });

  it('deve validar e falhar se uma tabela gmail_* não existir', async () => {
    mockSelect.mockResolvedValue({ error: { message: 'relation "gmail_test" does not exist' } });

    const { data, error, requestId } = await safeClient.from('gmail_test', (q) => q.select('*'));

    expect(data).toEqual([]);
    expect(error?.message).toContain('não disponível');
    expect(requestId).toBeDefined();
  });

  it('deve usar cache para validações subsequentes', async () => {
    const tableName = 'gmail_cached';
    
    // Resolve com objeto que NÃO contém "does not exist"
    mockSelect.mockResolvedValue({ data: [{ id: 1 }], error: null });

    const res1 = await safeClient.from(tableName, (q) => q.select('*'));
    expect(res1.data).toEqual([{ id: 1 }]);
    
    mockSelect.mockResolvedValue({ data: [{ id: 2 }], error: null });
    const res2 = await safeClient.from(tableName, (q) => q.select('*'));
    expect(res2.data).toEqual([{ id: 2 }]);

    expect(mockSelect).toHaveBeenCalledTimes(3);
  });

  it('deve incluir requestId em todas as respostas', async () => {
    mockRpc.mockResolvedValue({ data: { status: 'ok' }, error: null });
    const { requestId } = await safeClient.rpc('any_rpc');
    expect(requestId).toMatch(/^[a-z0-9]+$/);
  });

  it('deve lidar com retornos malformados (não array em from)', async () => {
    mockSelect.mockResolvedValue({ data: { not: 'an_array' }, error: null });
    const { data } = await safeClient.from('regular_table', (q) => q.select('*'));
    expect(data).toEqual([]);
  });

  it('deve validar RPCs rpc_gmail_*', async () => {
    // Para falhar, o mock deve retornar explicitamente a mensagem de erro que checamos
    mockRpc.mockResolvedValue({ error: { message: 'function rpc_gmail_test() does not exist' } });

    const { error } = await safeClient.rpc('rpc_gmail_test');
    expect(error?.message).toContain('não disponível');
  });
});