
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeClient } from '../safeClient';

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('../client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: (name: string, params: any) => mockRpc(name, params),
  },
}));

describe('safeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve retornar dados corretamente em uma query from', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
    });

    const { data, error } = await safeClient.from('any_table', (q) => q.select('*').eq('id', 1));

    expect(data).toEqual([{ id: 1 }]);
    expect(error).toBeNull();
    expect(mockFrom).toHaveBeenCalledWith('any_table');
  });

  it('deve lidar com erros de banco de dados (ex: tabela inexistente)', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: null, error: { message: 'relation "any_table" does not exist' } }),
    });

    const { data, error } = await safeClient.from('any_table', (q) => q.select('*'));

    expect(data).toBeNull();
    expect(error?.message).toContain('Recurso de banco de dados indisponível');
  });

  it('deve lidar com retornos inesperados de RPC (fallback para null)', async () => {
    mockRpc.mockResolvedValue({ data: undefined, error: null });

    const { data, error } = await safeClient.rpc('some_rpc');

    expect(data).toBeNull();
    expect(error).toBeNull();
  });

  it('deve funcionar com tabelas não tipadas via casting interno para any', async () => {
    // Este teste valida que o safeClient aceita qualquer string como tabela
    // e permite encadeamento de métodos sem erros de tipo TS (em tempo de execução)
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    });

    const { data } = await safeClient.from('untyped_table_xyz', (q) => q.update({ foo: 'bar' }).eq('id', 123));
    
    expect(data).toEqual({ success: true });
  });
});
