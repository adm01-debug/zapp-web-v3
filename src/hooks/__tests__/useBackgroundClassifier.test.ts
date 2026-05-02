import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBackgroundClassifier } from '../useBackgroundClassifier';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

vi.mock('@/lib/logger', () => ({
  getLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('useBackgroundClassifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns classifyInBackground function', () => {
    const { result } = renderHook(() => useBackgroundClassifier());
    expect(typeof result.current.classifyInBackground).toBe('function');
  });

  it('classifyInBackground does not throw', () => {
    const { result } = renderHook(() => useBackgroundClassifier());
    expect(() => {
      result.current.classifyInBackground('test-id', 'https://example.com/sticker.webp');
    }).not.toThrow();
  });

  it('accepts optional callback parameter', () => {
    const { result } = renderHook(() => useBackgroundClassifier());
    const callback = vi.fn();
    expect(() => {
      result.current.classifyInBackground('test-id', 'https://example.com/sticker.webp', callback);
    }).not.toThrow();
  });
});
