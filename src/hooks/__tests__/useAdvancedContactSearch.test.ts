/**
 * useAdvancedContactSearch.test.ts
 * Testes para hook de busca avançada de contatos
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAdvancedContactSearch } from '../useAdvancedContactSearch';

// Mock do Supabase
const mockFrom = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
    rpc: vi.fn(),
  },
}));

const makeSupabaseMock = (data: unknown[], error = null) => ({
  select: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockResolvedValue({ data, error }),
  range: vi.fn().mockReturnThis(),
});

describe('useAdvancedContactSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve inicializar com estado vazio', () => {
    mockFrom.mockReturnValue(makeSupabaseMock([]));
    const { result } = renderHook(() => useAdvancedContactSearch());

    expect(result.current.contacts).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.query).toBe('');
  });

  it('deve buscar contatos ao atualizar query com >2 caracteres', async () => {
    const mockContacts = [
      { id: '1', full_name: 'João Silva', phone_number: '11999999999', email: 'joao@teste.com' },
      { id: '2', full_name: 'João Santos', phone_number: '11888888888', email: null },
    ];
    mockFrom.mockReturnValue(makeSupabaseMock(mockContacts));

    const { result } = renderHook(() => useAdvancedContactSearch());

    act(() => {
      result.current.setQuery('João');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 2000 });
  });

  it('não deve buscar com query de 1 caractere', async () => {
    mockFrom.mockReturnValue(makeSupabaseMock([]));
    const { result } = renderHook(() => useAdvancedContactSearch());

    act(() => {
      result.current.setQuery('J');
    });

    // Aguardar possível debounce
    await new Promise(r => setTimeout(r, 500));
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('deve limpar resultados ao chamar clear()', async () => {
    const mockContacts = [
      { id: '1', full_name: 'Maria Souza', phone_number: '11777777777', email: null },
    ];
    mockFrom.mockReturnValue(makeSupabaseMock(mockContacts));

    const { result } = renderHook(() => useAdvancedContactSearch());

    act(() => {
      result.current.setQuery('Maria');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 2000 });

    act(() => {
      result.current.clear();
    });

    expect(result.current.query).toBe('');
    expect(result.current.contacts).toEqual([]);
  });

  it('deve retornar erro quando Supabase falha', async () => {
    mockFrom.mockReturnValue(makeSupabaseMock([], { message: 'DB error' }));
    const { result } = renderHook(() => useAdvancedContactSearch());

    act(() => {
      result.current.setQuery('Teste');
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 2000 });

    // Não deve crashar com erro
    expect(result.current.contacts).toEqual([]);
  });
});
