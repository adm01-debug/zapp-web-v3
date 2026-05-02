/**
 * useRetryOperationV2.ts
 * Exponential backoff retry hook for Supabase operations.
 * Used by ContactFormModal and other components that need resilient operations.
 *
 * Features:
 * - Configurable max retries and base delay
 * - Exponential backoff with jitter
 * - Abort signal support for cleanup
 * - Error classification (retry vs. no-retry)
 */
import { useState, useCallback, useRef } from 'react';

export interface RetryOptions {
  maxRetries?:    number;   // default: 3
  baseDelayMs?:   number;   // default: 500ms
  maxDelayMs?:    number;   // default: 5000ms
  backoffFactor?: number;   // default: 2
  onRetry?:       (attempt: number, error: Error) => void;
}

export interface RetryState {
  loading:     boolean;
  attempt:     number;
  lastError:   Error | null;
  isRetrying:  boolean;
}

// Errors that should NOT be retried (client errors)
const NON_RETRYABLE_CODES = new Set([
  'PGRST116',  // Row not found
  '23505',     // Unique violation
  '23503',     // Foreign key violation
  '42501',     // Insufficient privilege (RLS block)
  'PGRST301',  // JWT expired
]);

function isRetryable(error: unknown): boolean {
  if (!error) return false;
  const e = error as { code?: string; status?: number; message?: string };
  if (e.code && NON_RETRYABLE_CODES.has(e.code)) return false;
  // HTTP 4xx client errors — don't retry
  if (e.status && e.status >= 400 && e.status < 500) return false;
  return true;
}

function calculateDelay(attempt: number, baseMs: number, maxMs: number, factor: number): number {
  const exponential = baseMs * Math.pow(factor, attempt);
  // Add ±20% jitter to prevent thundering herd
  const jitter = exponential * 0.2 * (Math.random() * 2 - 1);
  return Math.min(exponential + jitter, maxMs);
}

export function useRetryOperationV2(options: RetryOptions = {}) {
  const {
    maxRetries    = 3,
    baseDelayMs   = 500,
    maxDelayMs    = 5_000,
    backoffFactor = 2,
    onRetry,
  } = options;

  const [state, setState] = useState<RetryState>({
    loading: false, attempt: 0, lastError: null, isRetrying: false,
  });

  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(async <T>(
    operation:   () => Promise<T>,
    operationName = 'operation'
  ): Promise<T> => {
    // Abort any previous in-flight operation
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setState({ loading: true, attempt: 0, lastError: null, isRetrying: false });

    let lastErr: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (abort.signal.aborted) break;

      try {
        if (attempt > 0) {
          setState((prev) => ({ ...prev, isRetrying: true, attempt }));
          const delay = calculateDelay(attempt - 1, baseDelayMs, maxDelayMs, backoffFactor);
          await new Promise<void>((res) => setTimeout(res, delay));
          onRetry?.(attempt, lastErr);
        }

        const result = await operation();
        setState({ loading: false, attempt, lastError: null, isRetrying: false });
        return result;

      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));

        // Don't retry non-retryable errors
        if (!isRetryable(err)) {
          setState({ loading: false, attempt, lastError: lastErr, isRetrying: false });
          throw lastErr;
        }

        // On last attempt, give up
        if (attempt === maxRetries) {
          setState({ loading: false, attempt, lastError: lastErr, isRetrying: false });
          throw lastErr;
        }

        // Log for debugging (dev only)
        if (import.meta.env.DEV) {
          console.warn(`[useRetryOperationV2] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}):`, lastErr.message);
        }
      }
    }

    throw lastErr;
  }, [maxRetries, baseDelayMs, maxDelayMs, backoffFactor, onRetry]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState({ loading: false, attempt: 0, lastError: null, isRetrying: false });
  }, []);

  return { ...state, execute, cancel };
}

export default useRetryOperationV2;
