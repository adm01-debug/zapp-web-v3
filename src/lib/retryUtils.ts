import { log } from '@/lib/logger';

/**
 * Generic retry utility with exponential backoff and jitter.
 *
 * Designed for resilient Supabase and Evolution API calls that may
 * temporarily fail due to network issues, rate limiting, or transient
 * server errors.
 *
 * Usage:
 *   const { data } = await retryWithBackoff(
 *     () => supabase.from('messages').select(),
 *     { maxRetries: 3, initialDelayMs: 500 }
 *   );
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay before first retry in ms (default: 500) */
  initialDelayMs?: number;
  /** Whether to use exponential backoff (default: true) */
  exponential?: boolean;
  /** Called before each retry with the attempt number */
  onRetry?: (attempt: number, error: unknown) => void;
  /** Predicate to decide if an error is retryable (default: all errors) */
  isRetryable?: (error: unknown) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 500,
  exponential: true,
  onRetry: () => {},
  isRetryable: () => true,
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if the error is not retryable (e.g., 4xx client errors)
      if (!opts.isRetryable(error)) {
        throw error;
      }

      if (attempt < opts.maxRetries) {
        const baseDelay = opts.exponential
          ? opts.initialDelayMs * Math.pow(2, attempt)
          : opts.initialDelayMs;
        const jitter = Math.random() * baseDelay * 0.3; // 30% jitter
        const totalDelay = Math.round(baseDelay + jitter);

        log.warn(
          `[Retry] Attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${totalDelay}ms`,
        );

        opts.onRetry(attempt + 1, error);
        await new Promise((resolve) => setTimeout(resolve, totalDelay));
      }
    }
  }

  throw lastError;
}

/**
 * Checks if a Supabase error is retryable.
 * Returns false for client errors (4xx) that won't succeed on retry.
 */
export function isSupabaseRetryable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return true;

  const err = error as Record<string, unknown>;

  // PostgreSQL/Supabase error codes
  const code = String(err.code || '');
  const status = Number(err.status || err.statusCode || 0);
  const message = String(err.message || '');

  // Don't retry auth errors
  if (status === 401 || status === 403) return false;
  // Don't retry validation errors
  if (status === 400 || status === 422) return false;
  // Don't retry not-found
  if (status === 404) return false;
  // Don't retry unique constraint violations
  if (code === '23505') return false;
  // Don't retry foreign key violations
  if (code === '23503') return false;

  // Retry rate limits (429)
  if (status === 429) return true;
  // Retry server errors (5xx)
  if (status >= 500) return true;
  // Retry network errors
  if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) return true;

  return true;
}

/**
 * Convenience wrapper for retrying Supabase operations.
 */
export async function retrySupabase<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries,
    initialDelayMs: 500,
    isRetryable: isSupabaseRetryable,
  });
}
