import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageQueue, QueueItem } from '../useMessageQueue';

// Mock getLogger and toast
vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('useMessageQueue — Multi-contact Stress & Order', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const waitForQueueProcessing = async (result: any, expectedCount: number, timeoutMs = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const allDone = result.current.queue.every((i: any) => i.status === 'confirmed' || i.status === 'failed');
      const hasCorrectCount = result.current.queue.length === expectedCount;
      if (allDone && hasCorrectCount) return;
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });
    }
    throw new Error(`Timeout waiting for queue processing. Current queue: ${JSON.stringify(result.current.queue)}`);
  };

  it('processes items for a single contact and preserves order', async () => {
    const processedMessages: string[] = [];
    const contactId = 'contact-1';
    
    const processMessage = vi.fn(async (item: QueueItem) => {
      processedMessages.push(item.content);
      await new Promise(resolve => setTimeout(resolve, 5));
    });

    const { result } = renderHook(() => useMessageQueue(processMessage));

    const MESSAGES_COUNT = 10;

    await act(async () => {
      for (let i = 0; i < MESSAGES_COUNT; i++) {
        result.current.addToQueue(contactId, `msg-${i}`);
      }
    });

    await waitForQueueProcessing(result, MESSAGES_COUNT);

    expect(processedMessages.length).toBe(MESSAGES_COUNT);
    for (let i = 0; i < MESSAGES_COUNT; i++) {
      expect(processedMessages[i]).toBe(`msg-${i}`);
    }
  });

  it('processes messages for multiple contacts independently with attachments', async () => {
    const processedByContact: Record<string, string[]> = {};
    const metrics: any[] = [];
    
    const processMessage = vi.fn(async (item: QueueItem) => {
      const start = Date.now();
      if (!processedByContact[item.contactId]) processedByContact[item.contactId] = [];
      processedByContact[item.contactId].push(item.content);
      
      // Simulate attachment processing time based on "size" (small vs large)
      const delay = item.type === 'attachment' && item.content.includes('large') ? 50 : 10;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      metrics.push({
        id: item.id,
        contactId: item.contactId,
        type: item.type,
        latency: Date.now() - start
      });
    });

    const { result } = renderHook(() => useMessageQueue(processMessage));

    const CONTACTS = ['c1', 'c2', 'c3'];
    const ITEMS_PER_CONTACT = 5;

    await act(async () => {
      for (const contactId of CONTACTS) {
        for (let i = 0; i < ITEMS_PER_CONTACT; i++) {
          const type = i % 2 === 0 ? 'text' : 'attachment';
          const content = `${contactId}-${type}-${i}${type === 'attachment' && i === 1 ? '-large' : ''}`;
          result.current.addToQueue(contactId, content, undefined, type);
        }
      }
    });

    await waitForQueueProcessing(result, CONTACTS.length * ITEMS_PER_CONTACT);

    CONTACTS.forEach(contactId => {
      expect(processedByContact[contactId].length).toBe(ITEMS_PER_CONTACT);
      // Verify order for EACH contact
      processedByContact[contactId].forEach((content, i) => {
        const type = i % 2 === 0 ? 'text' : 'attachment';
        expect(content).toContain(`${contactId}-${type}-${i}`);
      });
    });

    // Test Summary for metrics
    const summary = result.current.getMetrics();
    console.log('Stress Test Metrics Summary:', JSON.stringify(summary, null, 2));
    expect(summary.totalSent).toBe(CONTACTS.length * ITEMS_PER_CONTACT);
    expect(summary.averageLatency).toBeGreaterThan(0);
  });

  it('persists and resumes queue after "reload" during simultaneous sends', async () => {
    const processedMessages: string[] = [];
    let isReloaded = false;
    
    const processMessage = vi.fn(async (item: QueueItem) => {
      if (!isReloaded && processedMessages.length === 2) {
        // "Crash" the app before processing more
        return; 
      }
      processedMessages.push(item.content);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    // Initial load
    const { result: result1, unmount } = renderHook(() => useMessageQueue(processMessage));

    await act(async () => {
      result1.current.addToQueue('c1', 'msg-1');
      result1.current.addToQueue('c1', 'msg-2');
      result1.current.addToQueue('c2', 'msg-A');
      result1.current.addToQueue('c2', 'msg-B');
    });

    // Let some process (wait for exactly 2 messages as per the mock logic)
    await act(async () => {
      let count = 0;
      while (count < 2) {
        count = result1.current.queue.filter(i => i.status === 'confirmed').length;
        if (count >= 2) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });

    // Simulate page reload
    unmount();
    isReloaded = true;
    
    // Create new processMessage that logs to the SAME array
    const { result: result2 } = renderHook(() => useMessageQueue(processMessage));

    // Wait for resumed processing (4 items total in queue)
    await waitForQueueProcessing(result2, 4);

    const allProcessed = processedMessages;
    expect(allProcessed).toContain('msg-1');
    expect(allProcessed).toContain('msg-2');
    expect(allProcessed).toContain('msg-A');
    expect(allProcessed).toContain('msg-B');
    
    // Verify relative order per contact is maintained
    const c1Msgs = allProcessed.filter(m => m === 'msg-1' || m === 'msg-2');
    const c2Msgs = allProcessed.filter(m => m === 'msg-A' || m === 'msg-B');
    expect(c1Msgs).toEqual(['msg-1', 'msg-2']);
    expect(c2Msgs).toEqual(['msg-A', 'msg-B']);
  });

  it('reconciles with delivery events at high frequency without breaking order', async () => {
    const processedMessages: string[] = [];
    const processMessage = vi.fn(async (item: QueueItem) => {
      processedMessages.push(item.content);
      // Simulate immediate confirmation for some, but others wait for webhook
      if (item.content.includes('webhook')) {
        // Set externalId to simulate what would happen in a real send
        item.externalId = `ext-${item.id}`;
        return; 
      }
      await new Promise(resolve => setTimeout(resolve, 5));
    });

    const { result } = renderHook(() => useMessageQueue(processMessage));

    await act(async () => {
      result.current.addToQueue('c1', 'msg-1-instant');
      result.current.addToQueue('c1', 'msg-2-webhook');
      result.current.addToQueue('c1', 'msg-3-instant');
    });

    // Wait for all messages to be processed (but some might be in 'confirmed' or 'pending' wait for webhook)
    const start = Date.now();
    while (Date.now() - start < 5000) {
      const allAttempted = result.current.queue.every(i => i.status === 'confirmed' || i.externalId);
      if (allAttempted && result.current.queue.length === 3) break;
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)); });
    }

    // Simulate high frequency webhook delivery
    await act(async () => {
      const webhookItem = result.current.queue.find(i => i.content === 'msg-2-webhook');
      if (webhookItem) {
        result.current.reconcileWithDelivery('c1', webhookItem.externalId!, 'confirmed');
      }
    });

    // All should be removed or confirmed
    await waitForQueueProcessing(result, 3);
    
    // Verify order
    expect(processedMessages).toEqual(['msg-1-instant', 'msg-2-webhook', 'msg-3-instant']);

    // Check metrics
    const metrics = result.current.getMetrics();
    // In confirmed status or removed. Since removeFromQueue has a 5s delay in the hook, they should still be there for metrics.
    expect(metrics.totalSent).toBeGreaterThanOrEqual(2);
  });
});
