import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMessageSendStatus } from '../useMessageSendStatus';
import { emitSendStatus, clearSendStatus } from '../sendStatusBus';

describe('useMessageSendStatus', () => {
  beforeEach(() => {
    clearSendStatus('msg-1');
    clearSendStatus('msg-2');
  });

  it('returns undefined when messageId is missing', () => {
    const { result } = renderHook(() => useMessageSendStatus(undefined));
    expect(result.current).toBeUndefined();
  });

  it('hydrates with the latest bus state on mount', () => {
    emitSendStatus('msg-1', { status: 'retrying', attempt: 2, totalRetries: 3 });
    const { result } = renderHook(() => useMessageSendStatus('msg-1'));
    expect(result.current?.status).toBe('retrying');
    expect(result.current?.attempt).toBe(2);
    expect(result.current?.totalRetries).toBe(3);
  });

  it('updates when new statuses are emitted', () => {
    const { result } = renderHook(() => useMessageSendStatus('msg-1'));
    act(() => {
      emitSendStatus('msg-1', { status: 'sending' });
    });
    expect(result.current?.status).toBe('sending');
    act(() => {
      emitSendStatus('msg-1', { status: 'retrying', attempt: 1, totalRetries: 3 });
    });
    expect(result.current?.status).toBe('retrying');
    expect(result.current?.attempt).toBe(1);
  });

  it('ignores updates targeted at other messages', () => {
    const { result } = renderHook(() => useMessageSendStatus('msg-1'));
    act(() => {
      emitSendStatus('msg-2', { status: 'failed' });
    });
    expect(result.current).toBeUndefined();
  });
});
