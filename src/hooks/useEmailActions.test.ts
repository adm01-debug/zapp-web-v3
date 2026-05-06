
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useEmail } from './useEmail';
import { safeClient } from '@/integrations/supabase/safeClient';
import { supabase as _supabase } from '@/integrations/supabase/client';

const supabase = _supabase as any;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
  },
}));

vi.mock('@/integrations/supabase/safeClient', () => ({
  safeClient: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

describe('useEmail - Labels and RPC Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('markAsRead', () => {
    it('should call rpc_email_mark_thread_read and update state on success', async () => {
      vi.mocked(safeClient.rpc).mockResolvedValueOnce({ data: null, error: null });
      
      const { result } = renderHook(() => useEmail());
      
      // Mock threads in state
      act(() => {
        (result.current as any).setThreads([{ id: 't1', unread_count: 5 }]);
      });

      await act(async () => {
        await result.current.markAsRead('t1', true);
      });

      expect(safeClient.rpc).toHaveBeenCalledWith('rpc_email_mark_thread_read', {
        p_thread_id: 't1',
        p_read: true,
        p_message_ids: null
      });
      
      const threads = (result.current as any).threads;
      expect(threads[0].unread_count).toBe(0);
    });
  });

  describe('starThread', () => {
    it('should call rpc_email_star_thread and update state', async () => {
      vi.mocked(safeClient.rpc).mockResolvedValueOnce({ data: null, error: null });
      
      const { result } = renderHook(() => useEmail());
      
      act(() => {
        (result.current as any).setThreads([{ id: 't1', is_starred: false }]);
      });

      await act(async () => {
        await result.current.starThread('t1', true);
      });

      expect(safeClient.rpc).toHaveBeenCalledWith('rpc_email_star_thread', {
        p_thread_id: 't1',
        p_starred: true,
      });
      
      const threads = (result.current as any).threads;
      expect(threads[0].is_starred).toBe(true);
    });
  });

  describe('archiveThread', () => {
    it('should call rpc_email_archive_thread and remove thread from list', async () => {
      vi.mocked(safeClient.rpc).mockResolvedValueOnce({ data: null, error: null });
      
      const { result } = renderHook(() => useEmail());
      
      act(() => {
        (result.current as any).setThreads([{ id: 't1' }, { id: 't2' }]);
      });

      await act(async () => {
        await result.current.archiveThread('t1');
      });

      expect(safeClient.rpc).toHaveBeenCalledWith('rpc_email_archive_thread', {
        p_thread_id: 't1',
        p_archived: true,
      });
      
      const threads = (result.current as any).threads;
      expect(threads).toHaveLength(1);
      expect(threads[0].id).toBe('t2');
    });
  });

  describe('assignThread', () => {
    it('should call rpc_email_assign_thread and update assigned agent', async () => {
      vi.mocked(safeClient.rpc).mockResolvedValueOnce({ data: null, error: null });
      
      const { result } = renderHook(() => useEmail());
      
      act(() => {
        (result.current as any).setThreads([{ id: 't1', assigned_to: null }]);
      });

      await act(async () => {
        await result.current.assignThread('t1', 'agent_456');
      });

      expect(safeClient.rpc).toHaveBeenCalledWith('rpc_email_assign_thread', {
        p_thread_id: 't1',
        p_agent_id: 'agent_456',
      });
      
      const threads = (result.current as any).threads;
      expect(threads[0].assigned_to).toBe('agent_456');
    });

    it('should handle RPC errors', async () => {
      vi.mocked(safeClient.rpc).mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'RPC Error' } as any,
        requestId: 'req_123'
      });
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const { result } = renderHook(() => useEmail());
      
      await act(async () => {
        await result.current.assignThread('t1', 'agent_456');
      });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Falha ao atribuir thread'), 'RPC Error');
      consoleSpy.mockRestore();
    });
  });
});
