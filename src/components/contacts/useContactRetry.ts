/**
 * useContactRetry.ts
 * Automatic retry with exponential backoff for contact save operations.
 *
 * Handles transient network failures gracefully:
 * - Shows "Sem conexão" toast on first failure
 * - Retries up to 3 times with 1s, 2s, 4s delays
 * - Shows "Salvando..." indicator during retry
 * - Recovers automatically when connection resumes
 * - Escalates to error toast if all retries fail
 */
import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  onSuccess?:   () => void;
  onFinalError?: (error: Error) => void;
}

type AsyncOperation<T> = () => Promise<T>;

interface RetryState {
  saving:   boolean;
  attempt:  number;
  lastError: Error | null;
}

export function useContactRetry(options: RetryOptions = {}) {
  const {
    maxAttempts  = 3,
    baseDelayMs  = 1_000,
    onSuccess,
    onFinalError,
  } = options;

  const { toast } = useToast();
  const [state, setState] = useState<RetryState>({
    saving: false, attempt: 0, lastError: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async <T>(operation: AsyncOperation<T>): Promise<T | null> => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setState({ saving: true, attempt: 0, lastError: null });

      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (abortRef.current.signal.aborted) return null;

        setState((s) => ({ ...s, attempt, saving: true }));

        try {
          const result = await operation();

          setState({ saving: false, attempt: 0, lastError: null });
          onSuccess?.();
          return result;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));

          const isNetworkError =
            lastError.message.includes('network') ||
            lastError.message.includes('fetch') ||
            lastError.message.includes('Failed to fetch') ||
            !navigator.onLine;

          if (attempt === 1 && isNetworkError) {
            toast({
              title: '📡 Sem conexão',
              description: `Tentando reconectar... (${attempt}/${maxAttempts})`,
              duration: baseDelayMs * maxAttempts,
            });
          } else if (attempt > 1 && isNetworkError) {
            // Suppress repeated toasts during retry
          } else if (!isNetworkError) {
            // Non-network error — don't retry
            break;
          }

          if (attempt < maxAttempts) {
            const delay = baseDelayMs * Math.pow(2, attempt - 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      }

      setState({ saving: false, attempt: 0, lastError });

      const isNetworkError =
        !navigator.onLine ||
        lastError?.message?.includes('fetch') ||
        lastError?.message?.includes('network');

      toast({
        title: isNetworkError ? '❌ Falha na conexão' : '❌ Erro ao salvar',
        description: isNetworkError
          ? 'Verifique sua conexão e tente novamente.'
          : lastError?.message ?? 'Tente novamente.',
        variant: 'destructive',
        duration: 6_000,
      });

      onFinalError?.(lastError ?? new Error('Unknown error'));
      return null;
    },
    [maxAttempts, baseDelayMs, onSuccess, onFinalError, toast]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState({ saving: false, attempt: 0, lastError: null });
  }, []);

  return {
    ...state,
    execute,
    cancel,
    isRetrying: state.saving && state.attempt > 1,
    statusLabel: state.saving
      ? state.attempt > 1
        ? `Reconectando... (${state.attempt}/${maxAttempts})`
        : 'Salvando...'
      : null,
  };
}

export default useContactRetry;
