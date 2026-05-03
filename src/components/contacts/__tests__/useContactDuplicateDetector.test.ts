import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContactDuplicateDetector } from '../useContactDuplicateDetector';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  }
}));

describe('useContactDuplicateDetector', () => {
  const workspaceId = 'ws-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve detectar duplicados por telefone', async () => {
    const mockContacts = [{ id: 'c1', name: 'John', phone: '11999999999', email: 'john@test.com' }];
    const mockSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: mockContacts, error: null }),
    };
    (supabase.from as any).mockReturnValue(mockSelect);

    const { result } = renderHook(() => useContactDuplicateDetector({ workspaceId }));

    await act(async () => {
      await result.current.checkDuplicates('11999999999', '', '');
    });

    expect(result.current.hasDuplicates).toBe(true);
    expect(result.current.duplicates[0].id).toBe('c1');
  });

  it('deve lidar com erro na consulta', async () => {
    const mockSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      or: vi.fn().mockRejectedValue(new Error('Query failed')),
    };
    (supabase.from as any).mockReturnValue(mockSelect);

    const { result } = renderHook(() => useContactDuplicateDetector({ workspaceId }));

    await act(async () => {
      await result.current.checkDuplicates('11999999999', '', '');
    });

    expect(result.current.checking).toBe(false);
    expect(result.current.hasDuplicates).toBe(false);
  });
});
