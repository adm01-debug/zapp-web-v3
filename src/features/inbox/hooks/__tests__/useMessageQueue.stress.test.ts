import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  it('processes many items across multiple contacts in parallel but preserves order per contact', async () => {
    const processedMessages: Record<string, string[]> = {};
    
    // Process function that takes some time to simulate async work
    const processMessage = vi.fn(async (item: QueueItem) => {
      if (!processedMessages[item.contactId]) {
        processedMessages[item.contactId] = [];
      }
      processedMessages[item.contactId].push(item.content);
      // Minimal delay to ensure non-blocking but sequential execution
      await new Promise(resolve => setTimeout(resolve, 1));
    });

    const { result } = renderHook(() => useMessageQueue(processMessage));

    const CONTACTS_COUNT = 3;
    const MESSAGES_PER_CONTACT = 10;
    const TOTAL_MESSAGES = CONTACTS_COUNT * MESSAGES_PER_CONTACT;

    // 1. Add messages for multiple contacts
    await act(async () => {
      for (let i = 0; i < MESSAGES_PER_CONTACT; i++) {
        for (let c = 0; c < CONTACTS_COUNT; c++) {
          const contactId = `contact-${c}`;
          result.current.addToQueue(contactId, `message-${i}-for-${contactId}`);
        }
      }
    });

    expect(result.current.queue.length).toBe(TOTAL_MESSAGES);

    // 2. Poll for completion
    let attempts = 0;
    while (attempts < 50) {
      const pendingOrSending = result.current.queue.filter(i => i.status === 'pending' || i.status === 'sending');
      if (pendingOrSending.length === 0) break;
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      attempts++;
    }

    const totalProcessed = Object.values(processedMessages).reduce((acc, curr) => acc + curr.length, 0);
    expect(totalProcessed).toBe(TOTAL_MESSAGES);

    // 3. CRITICAL: Validate order per contact
    for (let c = 0; c < CONTACTS_COUNT; c++) {
      const contactId = `contact-${c}`;
      const messages = processedMessages[contactId];
      expect(messages.length).toBe(MESSAGES_PER_CONTACT);
      
      for (let i = 0; i < MESSAGES_PER_CONTACT; i++) {
        expect(messages[i]).toBe(`message-${i}-for-${contactId}`);
      }
    }
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
      await new Promise(resolve => setTimeout(resolve, 1));
    });

    const { result } = renderHook(() => useMessageQueue(processMessage));

    await act(async () => {
      result.current.addToQueue(contactId, 'msg-0');
      result.current.addToQueue(contactId, 'msg-1-fail');
      result.current.addToQueue(contactId, 'msg-2');
    });

    // Run processing
    let attempts = 0;
    while (attempts < 50) {
      const pendingOrSending = result.current.queue.filter(i => i.status === 'pending' || i.status === 'sending');
      if (pendingOrSending.length === 0) break;

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      attempts++;
    }

    // Order must be msg-0, msg-1-fail (after retry), msg-2
    expect(processedMessages).toEqual(['msg-0', 'msg-1-fail', 'msg-2']);
  });
});
