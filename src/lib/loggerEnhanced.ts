/**
 * Logging utility for ZAPP WEB.
 *
 * Enhanced version with structured logging, log levels,
 * and optional remote log shipping.
 *
 * Usage:
 *   import { log } from '@/lib/logger';
 *   log.info('User logged in', { userId: '123' });
 *   log.error('Failed to send message', error);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  (import.meta.env.VITE_LOG_LEVEL as LogLevel) ||
  (import.meta.env.DEV ? 'debug' : 'warn');

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function formatTimestamp(): string {
  return new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
}

function formatMessage(level: LogLevel, message: string, ...args: unknown[]): void {
  if (!shouldLog(level)) return;

  const timestamp = formatTimestamp();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  switch (level) {
    case 'debug':
      console.debug(prefix, message, ...args);
      break;
    case 'info':
      console.info(prefix, message, ...args);
      break;
    case 'warn':
      console.warn(prefix, message, ...args);
      break;
    case 'error':
      console.error(prefix, message, ...args);
      break;
  }
}

export const log = {
  debug: (message: string, ...args: unknown[]) => formatMessage('debug', message, ...args),
  info: (message: string, ...args: unknown[]) => formatMessage('info', message, ...args),
  warn: (message: string, ...args: unknown[]) => formatMessage('warn', message, ...args),
  error: (message: string, ...args: unknown[]) => formatMessage('error', message, ...args),

  /** Log with structured context (useful for monitoring) */
  structured: (level: LogLevel, event: string, context: Record<string, unknown>) => {
    if (!shouldLog(level)) return;
    formatMessage(level, event, context);
  },

  /** Time a function execution */
  time: <T>(label: string, fn: () => T): T => {
    const start = performance.now();
    const result = fn();
    const duration = Math.round(performance.now() - start);
    if (duration > 16) { // > 1 frame
      formatMessage('warn', `[Perf] ${label}: ${duration}ms`);
    } else {
      formatMessage('debug', `[Perf] ${label}: ${duration}ms`);
    }
    return result;
  },

  /** Time an async function */
  timeAsync: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    const duration = Math.round(performance.now() - start);
    if (duration > 100) {
      formatMessage('warn', `[Perf] ${label}: ${duration}ms`);
    } else {
      formatMessage('debug', `[Perf] ${label}: ${duration}ms`);
    }
    return result;
  },
};
