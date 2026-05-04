import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useOptimisticMessages } from '../useOptimisticMessages';

describe('useOptimisticMessages', () => {
  it('should create an optimistic message and add it to pending', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    
    let message;
    act(() => {
      message = result.current.createOptimistic({
        contactId: 'c1',
        conversationId: 'conv1',
        content: 'Hello World',
      });
    });

    expect(result.current.pendingCount).toBe(1);
    expect(message).toBeDefined();
    expect(message.content).toBe('Hello World');
    expect(message.status).toBe('sending');
    expect(message._optimistic).toBe(true);
  });

  it('should confirm a message as sent', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    
    let message;
    act(() => {
      message = result.current.createOptimistic({
        contactId: 'c1',
        conversationId: 'conv1',
        content: 'Hello',
      });
    });

    act(() => {
      result.current.confirmSent(message.id, 'ext-123');
    });

    expect(result.current.pending[message.id].status).toBe('sent');
    expect(result.current.pending[message.id].external_id).toBe('ext-123');
  });

  it('should mark a message as failed', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    
    let message;
    act(() => {
      message = result.current.createOptimistic({
        contactId: 'c1',
        conversationId: 'conv1',
        content: 'Fail me',
      });
    });

    act(() => {
      result.current.failOptimistic(message.id);
    });

    expect(result.current.pending[message.id].status).toBe('failed');
  });

  it('should merge optimistic messages with real ones and filter duplicates', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    
    act(() => {
      result.current.createOptimistic({
        contactId: 'c1',
        conversationId: 'conv1',
        content: 'Unique Message',
      });
      result.current.createOptimistic({
        contactId: 'c1',
        conversationId: 'conv1',
        content: 'Duplicate Message',
      });
    });

    const realMessages = [
      {
        id: 'real-1',
        content: 'Duplicate Message',
        sender: 'agent',
        timestamp: new Date(),
        status: 'sent',
      }
    ] as any;

    const merged = result.current.mergeWithReal(realMessages);
    
    // Should have 1 real + 1 unique optimistic (the duplicate is filtered because content matches)
    expect(merged.length).toBe(2);
    expect(merged.some(m => m.content === 'Unique Message')).toBe(true);
    // The merged list should contain the real message for the duplicate content
    expect((merged.find(m => m.content === 'Duplicate Message') as any)?._optimistic).toBeUndefined();
  });

  it('should cleanup specific messages', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    
    let m1, m2;
    act(() => {
      m1 = result.current.createOptimistic({ contactId: 'c1', conversationId: 'conv1', content: '1' });
      m2 = result.current.createOptimistic({ contactId: 'c1', conversationId: 'conv1', content: '2' });
    });

    expect(result.current.pendingCount).toBe(2);

    act(() => {
      result.current.cleanup([m1.id]);
    });

    expect(result.current.pendingCount).toBe(1);
    expect(result.current.pending[m2.id]).toBeDefined();
    expect(result.current.pending[m1.id]).toBeUndefined();
  });
});
