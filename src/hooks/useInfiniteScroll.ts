import { useInfiniteQuery } from '@tanstack/react-query';
import { fromTable } from '@/lib/supabaseHelpers';
import { useCallback, useEffect, useRef } from 'react';

interface UseInfiniteScrollOptions<T> {
  tableName: string;
  pageSize?: number;
  orderBy?: { column: string; ascending?: boolean };
  filters?: Record<string, unknown>;
  select?: string;
  /**
   * Pre-fetch margin around the sentinel. Larger values trigger
   * the next page earlier, before the user actually reaches the end.
   * Accepts any valid CSS margin string. Default: '400px' (≈ one viewport).
   */
  rootMargin?: string;
  /** IntersectionObserver threshold. Default: 0. */
  threshold?: number;
  /**
   * Debounce window (ms) applied to fetchNextPage to coalesce
   * rapid scroll bursts into a single request. Default: 150ms.
   */
  debounceMs?: number;
}

export function useInfiniteScroll<T extends { id: string }>({
  tableName,
  pageSize = 20,
  orderBy = { column: 'created_at', ascending: false },
  filters = {},
  select = '*',
  rootMargin = '400px',
  threshold = 0,
  debounceMs = 150,
}: UseInfiniteScrollOptions<T>) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIntersectingRef = useRef(false);

  const query = useInfiniteQuery({
    queryKey: ['infinite', tableName, filters, orderBy],
    queryFn: async ({ pageParam = 0 }) => {
      let q = fromTable(tableName)
        .select(select)
        .range(pageParam, pageParam + pageSize - 1)
        .order(orderBy.column, { ascending: orderBy.ascending });

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) q = q.eq(key, value);
      });

      const { data, error } = await q;
      if (error) throw error;
      return {
        data: (data || []) as T[],
        nextPage: data?.length === pageSize ? pageParam + pageSize : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  });

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  /** Debounced trigger — coalesces rapid intersection events. */
  const scheduleFetch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      // Re-check at flush time: state may have changed during the wait.
      if (
        isIntersectingRef.current &&
        hasNextPage &&
        !isFetchingNextPage
      ) {
        fetchNextPage();
      }
    }, debounceMs);
  }, [debounceMs, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const setLoadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      observerRef.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          isIntersectingRef.current = entry.isIntersecting;
          if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
            scheduleFetch();
          } else if (!entry.isIntersecting && debounceTimerRef.current) {
            // User scrolled away before debounce fired — cancel.
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
          }
        },
        { rootMargin, threshold },
      );
      if (node) observerRef.current.observe(node);
      loadMoreRef.current = node;
    },
    [hasNextPage, isFetchingNextPage, scheduleFetch, rootMargin, threshold],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  const allItems = query.data?.pages.flatMap((p) => p.data) ?? [];

  return {
    items: allItems,
    ...query,
    setLoadMoreRef,
    totalLoaded: allItems.length,
  };
}
