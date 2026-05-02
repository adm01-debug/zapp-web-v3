/**
 * useEmailSearch.test.ts — Testes para busca full-text de emails Gmail
 *
 * Cobre:
 * - Busca por texto (subject, from, snippet)
 * - Busca via rpc_gmail_search_threads
 * - Debounce de 300ms
 * - Busca vazia retorna inbox
 * - Paginação de resultados
 * - Reset de busca
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEmailSearch } from '../useEmailSearch';

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockRpc  = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc:  (fn: string, params?: unknown) => mockRpc(fn, params),
    from: (table: string) => mockFrom(table),
  },
}));

vi.useFakeTimers();

const MOCK_SEARCH_RESULTS = [
  {
    id: 'thread-1', account_id: 'acc-1',
    subject: 'Proposta comercial urgente',
    snippet: 'Olá, segue a proposta conforme solicitado...',
    from_email: 'cliente@empresa.com', from_name: 'Cliente',
    label_ids: ['INBOX'], unread_count: 1, message_count: 1,
    is_starred: false, sla_status: 'ok',
    last_message_at: new Date().toISOString(), created_at: new Date().toISOString(),
  },
  {
    id: 'thread-2', account_id: 'acc-1',
    subject: 'Proposta de parceria',
    snippet: 'Gostaríamos de apresentar nossa proposta...',
    from_email: 'parceiro@negocio.com', from_name: 'Parceiro',
    label_ids: ['INBOX'], unread_count: 0, message_count: 3,
    is_starred: true, sla_status: 'warning',
    last_message_at: new Date().toISOString(), created_at: new Date().toISOString(),
  },
];

describe('useEmailSearch — busca básica', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: MOCK_SEARCH_RESULTS, error: null });
  });

  it('deve iniciar com query vazia e resultados vazios', () => {
    const { result } = renderHook(() => useEmailSearch('acc-1'));
    expect(result.current.query).toBe('');
    expect(result.current.results).toHaveLength(0);
    expect(result.current.isSearching).toBe(false);
  });

  it('deve buscar após debounce de 300ms', async () => {
    const { result } = renderHook(() => useEmailSearch('acc-1'));

    act(() => {
      result.current.setQuery('proposta');
    });

    expect(mockRpc).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('rpc_gmail_search_threads', expect.objectContaining({
        p_query: 'proposta',
      }));
    });
  });

  it('deve retornar resultados quando encontrado', async () => {
    const { result } = renderHook(() => useEmailSearch('acc-1'));

    act(() => {
      result.current.setQuery('proposta');
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.results).toHaveLength(2);
    });

    expect(result.current.results[0].subject).toContain('Proposta');
  });

  it('deve retornar 0 resultados para query sem match', async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const { result } = renderHook(() => useEmailSearch('acc-1'));

    act(() => {
      result.current.setQuery('xyz-sem-resultado-123');
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.results).toHaveLength(0);
    });
  });

  it('não deve buscar com query < 2 caracteres', () => {
    const { result } = renderHook(() => useEmailSearch('acc-1'));

    act(() => {
      result.current.setQuery('a');
      vi.advanceTimersByTime(400);
    });

    expect(mockRpc).not.toHaveBeenCalled();
  });
});

describe('useEmailSearch — paginação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: MOCK_SEARCH_RESULTS, error: null });
  });

  it('deve buscar com offset ao carregar mais', async () => {
    const { result } = renderHook(() => useEmailSearch('acc-1'));

    act(() => {
      result.current.setQuery('proposta');
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => expect(result.current.results).toHaveLength(2));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(mockRpc).toHaveBeenCalledWith('rpc_gmail_search_threads', expect.objectContaining({
      p_offset: 2, // Offset = resultados atuais
    }));
  });
});

describe('useEmailSearch — reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: MOCK_SEARCH_RESULTS, error: null });
  });

  it('deve limpar resultados ao resetar', async () => {
    const { result } = renderHook(() => useEmailSearch('acc-1'));

    act(() => {
      result.current.setQuery('proposta');
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => expect(result.current.results).toHaveLength(2));

    act(() => {
      result.current.reset();
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toHaveLength(0);
  });
});

describe('useEmailSearch — busca por label', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRpc.mockResolvedValue({ data: [MOCK_SEARCH_RESULTS[0]], error: null });
  });

  it('deve filtrar por label STARRED', async () => {
    const { result } = renderHook(() => useEmailSearch('acc-1', 'STARRED'));

    act(() => {
      result.current.setQuery('proposta');
      vi.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('rpc_gmail_search_threads', expect.objectContaining({
        p_label_id: 'STARRED',
      }));
    });
  });
});

describe('useEmailSearch — sem conta ativa', () => {
  beforeEach(() => vi.clearAllMocks());

  it('não deve buscar sem accountId', () => {
    const { result } = renderHook(() => useEmailSearch(null));

    act(() => {
      result.current.setQuery('proposta');
      vi.advanceTimersByTime(400);
    });

    expect(mockRpc).not.toHaveBeenCalled();
  });
});
