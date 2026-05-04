import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTransferConversation } from '../useTransferConversation';
import * as db from '@/integrations/datasource/db';

vi.mock('@/integrations/datasource/db', () => ({
  dbFrom: vi.fn()
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

describe('useTransferConversation', () => {
  const contactId = 'contact-123';
  const whatsappConnectionId = 'conn-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should transfer to agent and insert system message', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: {}, error: null })
        })
      })
    });

    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    (db.dbFrom as any).mockImplementation((table: string) => {
      if (table === 'contacts') return { update: mockUpdate };
      if (table === 'messages') return { insert: mockInsert };
      return {};
    });

    const { result } = renderHook(() => useTransferConversation({ contactId, whatsappConnectionId }));

    await act(async () => {
      await result.current.transferConversation('agent', 'agent-999');
    });

    expect(mockUpdate).toHaveBeenCalledWith({ assigned_to: 'agent-999' });
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      contact_id: contactId,
      sender: 'agent',
      content: expect.stringContaining('transferido')
    }));
  });

  it('should handle transfer to queue (unassigning agent)', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: {}, error: null })
        })
      })
    });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    (db.dbFrom as any).mockImplementation((table: string) => {
      if (table === 'contacts') return { update: mockUpdate };
      if (table === 'messages') return { insert: mockInsert };
      return {};
    });

    const { result } = renderHook(() => useTransferConversation({ contactId, whatsappConnectionId }));

    await act(async () => {
      await result.current.transferConversation('queue', 'queue-001');
    });

    expect(mockUpdate).toHaveBeenCalledWith({ queue_id: 'queue-001', assigned_to: null });
  });

  it('should show error toast if database update fails', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB Error') })
        })
      })
    });

    (db.dbFrom as any).mockImplementation(() => ({ update: mockUpdate }));

    const { result } = renderHook(() => useTransferConversation({ contactId, whatsappConnectionId }));

    await act(async () => {
      await result.current.transferConversation('agent', 'target');
    });

    const { toast } = await import('@/hooks/use-toast');
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({
      variant: 'destructive'
    }));
  });
});
