import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStickerPagination } from '../useStickerPagination';

// Mock supabase
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockRange = vi.fn();
const mockHead = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        // Check if head query
        if (args[1] && typeof args[1] === 'object' && 'head' in (args[1] as Record<string, unknown>)) {
          return Promise.resolve({ count: 100 });
        }
        return {
          order: (...orderArgs: unknown[]) => {
            mockOrder(...orderArgs);
            return {
              order: () => ({
                limit: (...limitArgs: unknown[]) => {
                  mockLimit(...limitArgs);
                  return Promise.resolve({
                    data: Array.from({ length: 50 }, (_, i) => ({
                      id: `sticker-${i}`,
                      name: `Sticker ${i}`,
                      image_url: `https://example.com/sticker-${i}.webp`,
                      category: 'riso',
                      is_favorite: false,
                      use_count: 50 - i,
                      uploaded_by: null,
                      created_at: new Date(Date.now() - i * 1000).toISOString(),
                    })),
                    error: null,
                  });
                },
                range: (...rangeArgs: unknown[]) => {
                  mockRange(...rangeArgs);
                  return Promise.resolve({
                    data: Array.from({ length: 20 }, (_, i) => ({
                      id: `sticker-page2-${i}`,
                      name: `Sticker P2 ${i}`,
                      image_url: `https://example.com/sticker-p2-${i}.webp`,
                      category: 'amor',
                      is_favorite: false,
                      use_count: 10 - i,
                      uploaded_by: null,
                      created_at: new Date(Date.now() - (50 + i) * 1000).toISOString(),
                    })),
                    error: null,
                  });
                },
              }),
            };
          },
        };
      },
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

describe('useStickerPagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with empty state', () => {
    const { result } = renderHook(() => useStickerPagination());
    expect(result.current.items).toHaveLength(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasMore).toBe(true);
  });

  it('exposes loadInitialPage and loadNextPage', () => {
    const { result } = renderHook(() => useStickerPagination());
    expect(typeof result.current.loadInitialPage).toBe('function');
    expect(typeof result.current.loadNextPage).toBe('function');
  });

  it('updateItem modifies an item in place', () => {
    const { result } = renderHook(() => useStickerPagination());

    // Manually set some items for testing
    act(() => {
      result.current.prependItem({
        id: 'test-1',
        name: 'Test',
        image_url: 'https://example.com/test.webp',
        category: 'riso',
        is_favorite: false,
        use_count: 0,
        uploaded_by: null,
        created_at: new Date().toISOString(),
      });
    });

    act(() => {
      result.current.updateItem('test-1', { is_favorite: true });
    });

    expect(result.current.items[0]?.is_favorite).toBe(true);
  });

  it('removeItem removes an item', () => {
    const { result } = renderHook(() => useStickerPagination());

    act(() => {
      result.current.prependItem({
        id: 'remove-me',
        name: 'Remove',
        image_url: 'https://example.com/remove.webp',
        category: 'riso',
        is_favorite: false,
        use_count: 0,
        uploaded_by: null,
        created_at: new Date().toISOString(),
      });
    });

    expect(result.current.items).toHaveLength(1);

    act(() => {
      result.current.removeItem('remove-me');
    });

    expect(result.current.items).toHaveLength(0);
  });

  it('prependItem adds to beginning', () => {
    const { result } = renderHook(() => useStickerPagination());

    act(() => {
      result.current.prependItem({
        id: 'first',
        name: 'First',
        image_url: 'https://example.com/first.webp',
        category: 'riso',
        is_favorite: false,
        use_count: 0,
        uploaded_by: null,
        created_at: new Date().toISOString(),
      });
    });

    act(() => {
      result.current.prependItem({
        id: 'second',
        name: 'Second',
        image_url: 'https://example.com/second.webp',
        category: 'amor',
        is_favorite: false,
        use_count: 0,
        uploaded_by: null,
        created_at: new Date().toISOString(),
      });
    });

    expect(result.current.items[0]?.id).toBe('second');
    expect(result.current.items[1]?.id).toBe('first');
  });

  it('has correct pageSize constant', () => {
    const { result } = renderHook(() => useStickerPagination());
    expect(result.current.pageSize).toBe(50);
  });
});
