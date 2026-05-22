import { vi } from 'vitest';

export function mockLogger() {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

export function mockLoggerModule() {
  const instance = mockLogger();
  return {
    log: instance,
    logger: instance,
    getLogger: () => mockLogger(),
    createLogger: () => mockLogger(),
    generateCorrelationId: vi.fn(() => 'test-correlation-id'),
    getSessionId: vi.fn(() => 'test-session-id'),
    logPerformance: vi.fn((_label: string, fn: () => void) => fn()),
    logAsyncPerformance: vi.fn(async <T>(_label: string, fn: () => Promise<T>) => fn()),
  };
}
