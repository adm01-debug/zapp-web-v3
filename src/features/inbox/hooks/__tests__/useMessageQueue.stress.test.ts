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

  it('processes items for a single contact and preserves order', async () => {
    const processedMessages: string[] = [];
    const contactId = 'contact-1';
    
    const processMessage = vi.fn(async (item: QueueItem) => {
      processedMessages.push(item.content);
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 5));
    });

    const { result } = renderHook(() => useMessageQueue(processMessage));

    const MESSAGES_COUNT = 10;

    await act(async () => {
      for (let i = 0; i < MESSAGES_COUNT; i++) {
        result.current.addToQueue(contactId, `msg-${i}`);
      }
    });

    // Esperar processamento (itens são removidos 5s após confirmados, mas aqui focamos no processamento)
    // Vamos esperar até que todos estejam 'confirmed'
    let attempts = 0;
    while (attempts < 100) {
      const allConfirmed = result.current.queue.every(i => i.status === 'confirmed');
      if (allConfirmed && result.current.queue.length === MESSAGES_COUNT) break;
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      attempts++;
    }

    expect(processedMessages.length).toBe(MESSAGES_COUNT);
    for (let i = 0; i < MESSAGES_COUNT; i++) {
      expect(processedMessages[i]).toBe(`msg-${i}`);
    }
  });

  it('processes messages for multiple contacts independently', async () => {
    const processedByContact: Record<string, string[]> = {};
    
    const processMessage = vi.fn(async (item: QueueItem) => {
      if (!processedByContact[item.contactId]) processedByContact[item.contactId] = [];
      processedByContact[item.contactId].push(item.content);
      await new Promise(resolve => setTimeout(resolve, 5));
    });

    const { result } = renderHook(() => useMessageQueue(processMessage));

    await act(async () => {
      result.current.addToQueue('c1', 'c1-m1');
      result.current.addToQueue('c2', 'c2-m1');
    });

    let attempts = 0;
    while (attempts < 50) {
      const allConfirmed = result.current.queue.every(i => i.status === 'confirmed');
      if (allConfirmed && result.current.queue.length === 2) break;
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      attempts++;
    }

    expect(processedByContact['c1']).toEqual(['c1-m1']);
    expect(processedByContact['c2']).toEqual(['c2-m1']);
  });

  it('maintains order even with interleaved failures and retries', async () => {
    const processedMessages: string[] = [];
    const contactId = 'shared-contact';
    
    const processMessage = vi.fn(async (item: QueueItem) => {
      if (item.content.includes('fail') && item.retryCount === 0) {
        throw new Error('Intermittent failure');
      }
      processedMessages.push(item.content);
      await new Promise(resolve => setTimeout(resolve, 5));
    });

    const { result } = renderHook(() => useMessageQueue(processMessage));

    await act(async () => {
      result.current.addToQueue(contactId, 'msg-0');
      result.current.addToQueue(contactId, 'msg-1-fail');
      result.current.addToQueue(contactId, 'msg-2');
    });

    let attempts = 0;
    while (attempts < 100) {
      const allConfirmed = result.current.queue.every(i => i.status === 'confirmed');
      if (allConfirmed && result.current.queue.length === 3) break;
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      attempts++;
    }

    expect(processedMessages).toEqual(['msg-0', 'msg-1-fail', 'msg-2']);
  });
});
