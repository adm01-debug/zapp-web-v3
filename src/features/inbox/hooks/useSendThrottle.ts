import { useRef, useCallback } from 'react';

interface UseSendThrottleOptions {
  /** Minimum interval between sends in milliseconds (default: 500ms) */
  minIntervalMs?: number;
  /** Maximum number of sends within the burst window (default: 5) */
  burstLimit?: number;
  /** Burst window duration in milliseconds (default: 3000ms = 3s) */
  burstWindowMs?: number;
}

/**
 * Prevents rapid-fire message sending that could overwhelm the backend
 * or Evolution API rate limits.
 *
 * Without this, an agent can press Enter repeatedly and send 50 messages
 * in 2 seconds, causing:
 * - Evolution API rate limiting (429 errors)
 * - Duplicate messages if the send handler runs concurrently
 * - Poor UX with messages appearing out of order
 *
 * This hook provides two layers of protection:
 * 1. **Minimum interval**: At least 500ms between consecutive sends
 * 2. **Burst limit**: Max 5 sends within any 3-second window
 */
export function useSendThrottle({
  minIntervalMs = 500,
  burstLimit = 5,
  burstWindowMs = 3000,
}: UseSendThrottleOptions = {}) {
  const lastSendRef = useRef(0);
  const sendTimestampsRef = useRef<number[]>([]);

  const canSend = useCallback((): boolean => {
    const now = Date.now();

    // Check minimum interval
    if (now - lastSendRef.current < minIntervalMs) {
      return false;
    }

    // Check burst limit: count sends within the burst window
    const windowStart = now - burstWindowMs;
    sendTimestampsRef.current = sendTimestampsRef.current.filter(t => t > windowStart);
    if (sendTimestampsRef.current.length >= burstLimit) {
      return false;
    }

    return true;
  }, [minIntervalMs, burstLimit, burstWindowMs]);

  const recordSend = useCallback(() => {
    const now = Date.now();
    lastSendRef.current = now;
    sendTimestampsRef.current.push(now);
  }, []);

  /**
   * Wraps a send function with throttle protection.
   * Returns the wrapped function and an `isThrottled` flag.
   */
  const throttledSend = useCallback(
    <T extends (...args: unknown[]) => unknown>(sendFn: T) => {
      return (...args: Parameters<T>): ReturnType<T> | undefined => {
        if (!canSend()) return undefined;
        recordSend();
        return sendFn(...args) as ReturnType<T>;
      };
    },
    [canSend, recordSend],
  );

  return {
    canSend,
    recordSend,
    throttledSend,
    /** Reset throttle state (e.g. when switching conversations) */
    reset: useCallback(() => {
      lastSendRef.current = 0;
      sendTimestampsRef.current = [];
    }, []),
  };
}
