import { vi } from 'vitest';

const makeLogger = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
});

export const log = makeLogger();

export const getLogger = vi.fn(() => makeLogger());

export const generateCorrelationId = vi.fn((prefix = 'req') => `${prefix}_test_${Date.now()}`);

export const getSessionId = vi.fn(() => 'test-session-id');
