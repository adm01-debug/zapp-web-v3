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
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('processes many items across multiple contacts in parallel but preserves order per contact', async () => {
    const processedMessages: Record<string, string[]> = {};
    
    // Process function that takes some time to simulate async work
    const processMessage = vi.fn(async (item: QueueItem) => {
      if (!processedMessages[item.contactId]) {
        processedMessages[item.contactId] = [];
      }
      processedMessages[item.contactId].push(item.content);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    });

    const { result } = renderHook(() => useMessageQueue(processMessage));

    const CONTACTS_COUNT = 5;
    const MESSAGES_PER_CONTACT = 20;
    const TOTAL_MESSAGES = CONTACTS_COUNT * MESSAGES_PER_CONTACT;

    // 1. Add messages for multiple contacts in a shuffled way
    await act(async () => {
      for (let i = 0; i < MESSAGES_PER_CONTACT; i++) {
        for (let c = 0; c < CONTACTS_COUNT; c++) {
          const contactId = `contact-${c}`;
          result.current.addToQueue(contactId, `message-${i}-for-${contactId}`);
        }
      }
    });

    // 2. Assert initial queue size
    expect(result.current.queue.length).toBe(TOTAL_MESSAGES);

    // 3. Process until finished
    // We need to advance timers repeatedly because processQueueForContact uses setTimeout for the next item
    let attempts = 0;
    while (result.current.queue.filter(i => i.status !== 'confirmed').length > 0 && attempts < 1000) {
      await act(async () => {
        vi.advanceTimersByTime(100);
        // Give microtasks a chance to run (promises)
        await new Promise(resolve => setTimeout(resolve, 0));
      });
      attempts++;
    }

    // 4. Assert all messages were processed
    const confirmedCount = result.current.queue.filter(i => i.status === 'confirmed').length;
    // Note: Items might be removed from queue after 5s in confirmed state
    // But within our test with fake timers, they should still be there or we check total processed
    
    const totalProcessed = Object.values(processedMessages).reduce((acc, curr) => acc + curr.length, 0);
    expect(totalProcessed).toBe(TOTAL_MESSAGES);

    // 5. CRITICAL: Validate order per contact
    for (let c = 0; c < CONTACTS_COUNT; c++) {
      const contactId = `contact-${c}`;
      const messages = processedMessages[contactId];
      expect(messages.length).toBe(MESSAGES_PER_CONTACT);
      
      for (let i = 0; i < MESSAGES_PER_CONTACT; i++) {
        expect(messages[i]).toBe(`message-${i}-for-${contactId}`);
      }
    }

    // 6. Validate no cross-contact mixing in processing logs
    // (Indirectly validated by the ordered messages per contact)
  });

  it('maintains order even with interleaved failures and retries', async () => {
    const processedMessages: string[] = [];
    const contactId = 'shared-contact';
    
    const processMessage = vi.fn(async (item: QueueItem) => {
      // Simulate failure for specific items on first attempt
      if (item.content.includes('fail') && item.retryCount === 0) {
        throw new Error('Intermittent failure');
      }
      processedMessages.push(item.content);
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    const { result } = renderHook(() => useMessageQueue(processMessage));

    await act(async () => {
      result.current.addToQueue(contactId, 'msg-0');
      result.current.addToQueue(contactId, 'msg-1-fail');
      result.current.addToQueue(contactId, 'msg-2');
    });

    // Run processing
    for (let i = 0; i < 20; i++) {
      await act(async () => {
        vi.advanceTimersByTime(200);
        await new Promise(resolve => setTimeout(resolve, 0));
      });
    }

    // Order must be msg-0, msg-1-fail (after retry), msg-2
    // Because the queue waits for the current item to finish (or fail definitively) 
    // before moving to the next.
    expect(processedMessages).toEqual(['msg-0', 'msg-1-fail', 'msg-2']);
  });
});
