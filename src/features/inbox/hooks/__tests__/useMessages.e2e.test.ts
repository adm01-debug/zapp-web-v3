import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessages } from '../useMessages';
import { messageService } from '../../services/messageService';
import { messageRepository } from '../../data-access/messageRepository';

vi.mock('../../services/messageService', () => ({
  messageService: {
    getAllMessagesForContact: vi.fn(),
  },
}));

vi.mock('../../data-access/messageRepository', () => ({
  messageRepository: {
    subscribeToMessages: vi.fn(() => ({})),
    unsubscribe: vi.fn(),
    fetchMessagesByContact: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: {
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/devRealtimeLogger', () => ({
  logMessagesSubscribe: vi.fn(),
  wrapMessagesHandler: vi.fn((name, handler) => handler),
}));

describe('useMessages E2E Flow Simulation', () => {
  const mockContactId = 'contact-123';
  const mockMessages = [
    { id: '1', contact_id: mockContactId, content: 'Hello', sender: 'contact', created_at: new Date().toISOString() },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (messageService.getAllMessagesForContact as any).mockResolvedValue(mockMessages);
  });

  it('should fetch messages and handle realtime updates', async () => {
    let insertCallback: any;
    (messageRepository.subscribeToMessages as any).mockImplementation((id, callbacks) => {
      insertCallback = callbacks.onInsert;
      return { id: 'channel-1' };
    });

    const { result, rerender } = renderHook(() => useMessages({ contactId: mockContactId }));

    // Check loading state
    expect(result.current.loading).toBe(true);

    // Wait for fetch
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.messages).toHaveLength(1);
    expect(result.current.loading).toBe(false);

    // Simulate Realtime INSERT
    const newMessage = { 
      id: '2', 
      contact_id: mockContactId, 
      content: 'New Message', 
      sender: 'agent', 
      created_at: new Date().toISOString() 
    };

    await act(async () => {
      insertCallback({ new: newMessage });
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].content).toBe('New Message');
  });

  it('should handle API failures gracefully', async () => {
    (messageService.getAllMessagesForContact as any).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useMessages({ contactId: mockContactId }));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.loading).toBe(false);
  });
});
