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
    
    const processMessage = async (item: QueueItem) => {
      // Avoid processing same item content twice for the test assertion
      if (processedMessages.includes(item.content)) return;

      if (!isReloaded && processedMessages.length >= 2) {
        throw new Error('Pre-reload crash'); 
      }
      processedMessages.push(item.content);
      await new Promise(resolve => setTimeout(resolve, 10));
    };

    const initialProcess = vi.fn(processMessage);

    const { result: result1, unmount } = renderHook(() => useMessageQueue(initialProcess));

    await act(async () => {
      result1.current.addToQueue('c1', 'msg-1');
      result1.current.addToQueue('c1', 'msg-2');
      result1.current.addToQueue('c2', 'msg-A');
      result1.current.addToQueue('c2', 'msg-B');
    });

    const start = Date.now();
    while (Date.now() - start < 5000) {
      const confirmedCount = result1.current.queue.filter(i => i.status === 'confirmed' || i.status === 'failed').length;
      if (confirmedCount >= 1) break;
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)); });
    }

    unmount();
    isReloaded = true;
    
    const secondProcess = vi.fn(processMessage);
    const { result: result2 } = renderHook(() => useMessageQueue(secondProcess));

    await waitForQueueProcessing(result2, 4);

    expect(processedMessages).toContain('msg-1');
    expect(processedMessages).toContain('msg-2');
    expect(processedMessages).toContain('msg-A');
    expect(processedMessages).toContain('msg-B');
    
    const c1Msgs = processedMessages.filter(m => m === 'msg-1' || m === 'msg-2');
    const c2Msgs = processedMessages.filter(m => m === 'msg-A' || m === 'msg-B');
    expect(c1Msgs).toEqual(['msg-1', 'msg-2']);
    expect(c2Msgs).toEqual(['msg-A', 'msg-B']);
  });

  it('reconciles with delivery events at high frequency without breaking order', async () => {
    const processedMessages: string[] = [];
    const processMessage = vi.fn(async (item: QueueItem) => {
      processedMessages.push(item.content);
      if (item.content.includes('webhook')) {
        item.externalId = `ext-${item.id}`;
        // Do NOT resolve yet, let it stay in 'sending' status if possible
        // but hook sets to confirmed AFTER processMessage resolves.
        // So we wait for it to be confirmed.
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

    // Wait until at least 2 messages are in confirmed status
    const start = Date.now();
    while (Date.now() - start < 5000) {
      const confirmedCount = result.current.queue.filter(i => i.status === 'confirmed').length;
      if (confirmedCount >= 2) break;
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 100)); });
    }

    // Now reconcile the webhook one
    await act(async () => {
      const webhookItem = result.current.queue.find(i => i.content === 'msg-2-webhook');
      if (webhookItem) {
        result.current.reconcileWithDelivery('c1', `ext-${webhookItem.id}`, 'confirmed');
      }
    });

    await waitForQueueProcessing(result, 3);
    
    // The items might have been processed in order but reconciled in any order
    expect(processedMessages).toEqual(['msg-1-instant', 'msg-2-webhook', 'msg-3-instant']);

    const metrics = result.current.getMetrics();
    expect(metrics.totalSent).toBeGreaterThanOrEqual(2);
  });
});
