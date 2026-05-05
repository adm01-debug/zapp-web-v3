import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageQueue } from '../useMessageQueue';

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

    await act(async () => {
      vi.advanceTimersByTime(10); // Trigger debounced processing
    });

    expect(result.current.queue[0].status).toBe('sending');
    expect(result.current.queue[1].status).toBe('sending');

    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(result.current.queue.length).toBe(0);
  });

  it('should persist and restore queue (excluding attachments)', () => {
    const processMessage = vi.fn().mockReturnValue(new Promise(() => {})); // Never resolves
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

  it('should reconcile with external delivery', () => {
    const processMessage = vi.fn().mockReturnValue(new Promise(() => {})); 
    const { result } = renderHook(() => useMessageQueue(processMessage));

    act(() => {
      result.current.addToQueue('contact-1', 'Match me');
    });

    act(() => {
      // Simulate externalId setting
      result.current.queue[0].externalId = 'ext-123';
    });

    act(() => {
      result.current.reconcileWithDelivery('contact-1', 'ext-123');
    });

    expect(result.current.queue.length).toBe(0);
  });

  it('should reset progress on retry', async () => {
    const processMessage = vi.fn().mockReturnValue(new Promise(() => {})); 
    const { result } = renderHook(() => useMessageQueue(processMessage));

    act(() => {
      result.current.addToQueue('contact-1', 'Retry me');
    });

    act(() => {
      // Manually set status to failed for test
      const item = result.current.queue[0];
      // We can't easily set status because it's state, but we can simulate a failure
    });
    
    // Simpler: just test updateProgress and retryMessage logic directly
    act(() => {
      result.current.updateProgress(result.current.queue[0].id, 75);
    });
    expect(result.current.queue[0].progress).toBe(75);

    act(() => {
      result.current.retryMessage(result.current.queue[0].id);
    });

    expect(result.current.queue[0].status).toBe('pending');
    expect(result.current.queue[0].progress).toBe(0);
  });
});
