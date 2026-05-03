import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOptimisticMessages } from '../useOptimisticMessages';

describe('useOptimisticMessages — Daily Scenarios', () => {
  it('Scenario 1: Instant Message Appearance (Optimistic Send)', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    
    act(() => {
      result.current.createOptimistic({
        contactId: 'contact-1',
        conversationId: 'conv-1',
        content: 'Olá, como posso ajudar?',
      });
    });

    expect(result.current.pendingCount).toBe(1);
    const merged = result.current.mergeWithReal([]);
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe('sending');
    expect(merged[0].content).toBe('Olá, como posso ajudar?');
    expect((merged[0] as any)._optimistic).toBe(true);
  });

  it('Scenario 2: Reconciliation after API success (Manual/Poll confirm)', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    let optId = '';

    act(() => {
      const opt = result.current.createOptimistic({
        contactId: 'contact-1',
        conversationId: 'conv-1',
        content: 'Test message',
      });
      optId = opt.id;
    });

    // Simulate API success
    act(() => {
      result.current.confirmSent(optId, 'external-123');
    });

    const mergedBeforeReal = result.current.mergeWithReal([]);
    expect(mergedBeforeReal[0].status).toBe('sent');
    expect(mergedBeforeReal[0].external_id).toBe('external-123');

    // Simulate real message arriving via webhook/poll
    const realMessages = [{
      id: 'real-1',
      external_id: 'external-123',
      content: 'Test message',
      status: 'delivered',
      sender: 'agent',
      timestamp: new Date()
    }] as any;

    const mergedAfterReal = result.current.mergeWithReal(realMessages);
    // Optimistic should be removed because external_id matches
    expect(mergedAfterReal).toHaveLength(1);
    expect(mergedAfterReal[0].id).toBe('real-1');
    expect(result.current.pendingCount).toBe(0);
  });

  it('Scenario 3: Content-based Fallback Reconciliation', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    
    act(() => {
      result.current.createOptimistic({
        contactId: 'contact-1',
        conversationId: 'conv-1',
        content: 'Fallback match test',
      });
    });

    // Real message arrives but lacks external_id or has a different one
    const realMessages = [{
      id: 'real-2',
      content: 'Fallback match test',
      status: 'sent',
      sender: 'agent',
      timestamp: new Date()
    }] as any;

    const merged = result.current.mergeWithReal(realMessages);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('real-2');
    expect(result.current.pendingCount).toBe(0);
  });

  it('Scenario 4: Handling Failures', () => {
    const { result } = renderHook(() => useOptimisticMessages());
    let optId = '';

    act(() => {
      const opt = result.current.createOptimistic({
        contactId: 'contact-1',
        conversationId: 'conv-1',
        content: 'This will fail',
      });
      optId = opt.id;
    });

    act(() => {
      result.current.failOptimistic(optId);
    });

    const merged = result.current.mergeWithReal([]);
    expect(merged[0].status).toBe('failed');
  });

  it('Scenario 5: Stale Cleanup', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useOptimisticMessages());
    
    act(() => {
      result.current.createOptimistic({
        contactId: 'contact-1',
        conversationId: 'conv-1',
        content: 'Old message',
      });
    });

    expect(result.current.pendingCount).toBe(1);

    // Fast forward 61 seconds
    act(() => {
      vi.advanceTimersByTime(61000);
    });

    const merged = result.current.mergeWithReal([]);
    expect(merged).toHaveLength(0);
    expect(result.current.pendingCount).toBe(0);
    
    vi.useRealTimers();
  });
});
