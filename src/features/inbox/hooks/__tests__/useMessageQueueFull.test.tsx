import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageQueue } from '../useMessageQueue';
import { toast } from '@/hooks/use-toast';

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('useMessageQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
  });

  it('should process messages for multiple contacts in parallel', async () => {
    const processMessage = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    const { result } = renderHook(() => useMessageQueue(processMessage));

    act(() => {
      result.current.addToQueue('contact-A', 'Msg A');
      result.current.addToQueue('contact-B', 'Msg B');
    });

    // Fast forward to trigger effects
    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.queue.length).toBe(2);
    expect(result.current.queue[0].status).toBe('sending');
    expect(result.current.queue[1].status).toBe('sending');
  });

  it('should persist and restore queue (excluding attachments)', () => {
    const processMessage = vi.fn();
    const { result, unmount } = renderHook(() => useMessageQueue(processMessage));

    act(() => {
      result.current.addToQueue('contact-1', 'Persist me');
    });

    const saved = JSON.parse(localStorage.getItem('chat_message_queue') || '[]');
    expect(saved.length).toBe(1);
    expect(saved[0].content).toBe('Persist me');

    unmount();

    const { result: result2 } = renderHook(() => useMessageQueue(processMessage));
    expect(result2.current.queue.length).toBe(1);
    expect(result2.current.queue[0].content).toBe('Persist me');
  });

  it('should reset progress on retry', async () => {
    const processMessage = vi.fn().mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error('Fail')), 50)));
    const { result } = renderHook(() => useMessageQueue(processMessage));

    act(() => {
      result.current.addToQueue('contact-1', 'Retry me');
    });

    // Run processing (including MAX_AUTO_RETRIES = 2)
    // 1st attempt: 50ms (fail) + 100ms (debounce)
    // 2nd attempt: 50ms (fail) + 100ms (debounce)
    // 3rd attempt: 50ms (fail)
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current.queue[0].status).toBe('failed');

    act(() => {
      result.current.updateProgress(result.current.queue[0].id, 50);
    });
    expect(result.current.queue[0].progress).toBe(50);

    // Stop timers before retry to catch 'pending' state
    act(() => {
      result.current.retryMessage(result.current.queue[0].id);
    });

    expect(result.current.queue[0].status).toBe('pending');
    expect(result.current.queue[0].progress).toBe(0);
  });

  it('should reconcile with external delivery', () => {
    const processMessage = vi.fn();
    const { result } = renderHook(() => useMessageQueue(processMessage));

    act(() => {
      result.current.addToQueue('contact-1', 'Match me');
    });

    const id = result.current.queue[0].id;
    act(() => {
      // Manually set externalId as if it was returned by API
      result.current.queue[0].externalId = 'ext-123';
    });

    act(() => {
      result.current.reconcileWithDelivery('contact-1', 'ext-123');
    });

    expect(result.current.queue.length).toBe(0);
  });
});
