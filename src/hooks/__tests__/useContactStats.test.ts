/**
 * useContactStats.test.ts
 * Testes para o hook de estatísticas de contatos
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useContactStats } from '../useContactStats';

const mockRpc = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: (name: string, params?: unknown) => mockRpc(name, params),
  },
}));

const DEFAULT_STATS = {
  total: 12662,
  with_email: 0,
  with_company: 2,
  by_lead_status: { novo: 12660, new: 2 },
  by_instance: { wpp2: 12662 },
  pending_lgpd_deletion: 0,
  recent_30d: 10676,
  duplicate_candidates: 3,
};

describe('useContactStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar estatísticas com sucesso', async () => {
    mockRpc.mockResolvedValue({ data: DEFAULT_STATS, error: null });

    const { result } = renderHook(() => useContactStats());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.stats).toBeDefined();
    expect(result.current.error).toBeNull();
  });

  it('deve retornar total de contatos', async () => {
    mockRpc.mockResolvedValue({ data: DEFAULT_STATS, error: null });

    const { result } = renderHook(() => useContactStats());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stats?.total).toBe(12662);
    expect(result.current.stats?.recent_30d).toBe(10676);
  });

  it('deve lidar com erro de rede', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'Erro de conexão' } });

    const { result } = renderHook(() => useContactStats());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).not.toBeNull();
    expect(result.current.stats).toBeNull();
  });

  it('deve identificar candidatos a duplicata', async () => {
    mockRpc.mockResolvedValue({ data: { ...DEFAULT_STATS, duplicate_candidates: 5 }, error: null });

    const { result } = renderHook(() => useContactStats());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.stats?.duplicate_candidates).toBe(5);
    expect(result.current.hasDuplicates).toBe(true);
  });

  it('deve retornar hasDuplicates=false quando zero duplicatas', async () => {
    mockRpc.mockResolvedValue({ data: { ...DEFAULT_STATS, duplicate_candidates: 0 }, error: null });

    const { result } = renderHook(() => useContactStats());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasDuplicates).toBe(false);
  });
});
