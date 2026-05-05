import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageQueue } from '../useMessageQueue';

describe('useMessageQueue - Stress & Resilience', () => {
  const mockProcess = vi.fn();
  
  beforeEach(() => {
    mockProcess.mockReset();
    localStorage.clear();
  });

  it('should process messages sequentially for the same contact', async () => {
    let callCount = 0;
    mockProcess.mockImplementation(async () => {
      callCount++;
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    const { result } = renderHook(() => useMessageQueue(mockProcess));

    act(() => {
      result.current.addToQueue('contact1', 'msg1');
      result.current.addToQueue('contact1', 'msg2');
    });

    // Wait for processing
    await vi.waitFor(() => {
      expect(mockProcess).toHaveBeenCalledTimes(2);
    }, { timeout: 1000 });
    
    expect(callCount).toBe(2);
  });

  it('should handle rapid bursts of messages (Stress)', async () => {
    const { result } = renderHook(() => useMessageQueue(mockProcess));
    const burstSize = 50;

    act(() => {
      for (let i = 0; i < burstSize; i++) {
        result.current.addToQueue('contact_stress', `burst_${i}`);
      }
    });

    await vi.waitFor(() => {
      expect(result.current.queue.filter(i => i.status === 'confirmed').length + 
             result.current.queue.filter(i => i.status === 'pending').length).toBeLessThanOrEqual(burstSize);
    }, { timeout: 5000 });
  });
});
