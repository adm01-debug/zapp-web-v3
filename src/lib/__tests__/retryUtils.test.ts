import { describe, it, expect, vi } from 'vitest';
import {
  retryWithBackoff,
  isSupabaseRetryable,
} from '../retryUtils';

describe('retryUtils', () => {
  describe('retryWithBackoff', () => {
    it('returns result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('ok');
      const result = await retryWithBackoff(fn, { maxRetries: 3 });
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and succeeds', async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('ok');

      const result = await retryWithBackoff(fn, {
        maxRetries: 3,
        initialDelayMs: 10,
      });
      expect(result).toBe('ok');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws after max retries exhausted', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));
      await expect(
        retryWithBackoff(fn, { maxRetries: 2, initialDelayMs: 10 }),
      ).rejects.toThrow('always fails');
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('does not retry non-retryable errors', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('not retryable'));
      await expect(
        retryWithBackoff(fn, {
          maxRetries: 3,
          initialDelayMs: 10,
          isRetryable: () => false,
        }),
      ).rejects.toThrow('not retryable');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('calls onRetry callback', async () => {
      const onRetry = vi.fn();
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('ok');

      await retryWithBackoff(fn, {
        maxRetries: 2,
        initialDelayMs: 10,
        onRetry,
      });
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('isSupabaseRetryable', () => {
    it('returns false for 401 auth errors', () => {
      expect(isSupabaseRetryable({ status: 401 })).toBe(false);
    });

    it('returns false for 400 validation errors', () => {
      expect(isSupabaseRetryable({ status: 400 })).toBe(false);
    });

    it('returns false for unique constraint violations', () => {
      expect(isSupabaseRetryable({ code: '23505' })).toBe(false);
    });

    it('returns true for 429 rate limits', () => {
      expect(isSupabaseRetryable({ status: 429 })).toBe(true);
    });

    it('returns true for 500 server errors', () => {
      expect(isSupabaseRetryable({ status: 500 })).toBe(true);
    });

    it('returns true for network errors', () => {
      expect(isSupabaseRetryable({ message: 'fetch failed' })).toBe(true);
    });
  });
});
