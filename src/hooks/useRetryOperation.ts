/**
 * useRetryOperation.ts
 * Exponential backoff retry for contact save/update operations.
 * Handles transient network failures transparently.
 */
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

const FATAL_CODES = [
  'PGRST116',     // not found
  '23505',        // unique violation
  '23514',        // check constraint
  'CONTACT_NOT_FOUND',
  'CONFLICT',
  '401', '403',
];

interface RetryState { loading: boolean; attempt: number; lastError: string | null; }

export function useRetryOperation(maxAttempts = 3, baseDelayMs = 500) {
  const { toast } = useToast();
  const [state, setState] = useState<RetryState>({ loading: false, attempt: 0, lastError: null });

  const withRetry = useCallback(async <T>(fn: () => Promise<T>, label = 'Salvar'): Promise<T> => {
    let lastErr: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      setState({ loading: true, attempt, lastError: null });
      try {
        const result = await fn();
        setState({ loading: false, attempt: 0, lastError: null });
        return result;
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        lastErr = error;
        if (FATAL_CODES.some((c) => error.message.includes(c))) {
          setState({ loading: false, attempt: 0, lastError: error.message });
          throw error;
        }
        if (attempt === maxAttempts) break;
        const delay = Math.min(baseDelayMs * Math.pow(3, attempt - 1) * (1 + Math.random() * 0.2), 30000);
        setState({ loading: true, attempt, lastError: `Tentando novamente (${attempt}/${maxAttempts})...` });
        if (attempt > 1) toast({ title: `⏳ ${label}`, description: `Tentativa ${attempt + 1}/${maxAttempts}...`, duration: delay });
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    setState({ loading: false, attempt: 0, lastError: lastErr?.message ?? 'Erro' });
    throw lastErr;
  }, [maxAttempts, baseDelayMs, toast]);

  const reset = useCallback(() => setState({ loading: false, attempt: 0, lastError: null }), []);

  return { ...state, withRetry, reset };
}
