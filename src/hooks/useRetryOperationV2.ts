/**
 * useRetryOperationV2.ts
 * Exponential backoff retry for async form operations.
 * Retries only on network/timeout/rate-limit errors.
 * Schedule: attempt 1→immediate, 2→500ms, 3→2000ms
 */
import { useState, useCallback } from 'react';

export function useRetryOperationV2(maxAttempts = 3, baseDelayMs = 500) {
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const withRetry = useCallback(async (fn: () => Promise<void>, label = 'Operation'): Promise<void> => {
    setLoading(true);
    let lastErr: unknown;

    for (let i = 0; i < maxAttempts; i++) {
      setAttempt(i + 1);
      try {
        await fn();
        setLoading(false); setAttempt(0); return;
      } catch (err) {
        lastErr = err;
        const retryable = err instanceof Error && (
          /network|timeout|fetch|econnreset|429|503|502/i.test(err.message)
        );
        if (!retryable || i === maxAttempts - 1) { setLoading(false); setAttempt(0); throw err; }
        console.warn(`[retry] ${label} attempt ${i+1} failed, retrying...`);
        await new Promise<void>((r) => setTimeout(r, baseDelayMs * Math.pow(2, i)));
      }
    }
    setLoading(false); setAttempt(0); throw lastErr;
  }, [maxAttempts, baseDelayMs]);

  return { withRetry, loading, attempt };
}

export { useRetryOperationV2 as useRetryOperation };
