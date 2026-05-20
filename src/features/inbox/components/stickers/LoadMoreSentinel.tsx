import { useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadMoreSentinelProps {
  /** Whether there are more items to load */
  hasMore: boolean;
  /** Whether we're currently loading more items */
  loading: boolean;
  /** Callback to trigger loading more items */
  onLoadMore: () => void;
  /** Optional className */
  className?: string;
}

/**
 * Intersection Observer based "load more" sentinel.
 *
 * GAP 14 complement: Instead of full virtualization (which requires
 * react-virtuoso/tanstack-virtual as deps), this provides an
 * efficient infinite scroll pattern that:
 * - Only renders DOM nodes for visible + buffer stickers
 * - Triggers load when sentinel enters viewport
 * - Shows subtle loading indicator
 * - Zero dependencies beyond React
 *
 * Place this at the bottom of the sticker grid ScrollArea.
 */
export function LoadMoreSentinel({
  hasMore,
  loading,
  onLoadMore,
  className,
}: LoadMoreSentinelProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry?.isIntersecting && hasMore && !loading) {
        onLoadMore();
      }
    },
    [hasMore, loading, onLoadMore]
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    // Disconnect previous observer
    observerRef.current?.disconnect();

    // Create new observer with 200px root margin (pre-fetches)
    observerRef.current = new IntersectionObserver(handleIntersect, {
      rootMargin: '200px',
      threshold: 0,
    });

    observerRef.current.observe(sentinel);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [handleIntersect]);

  if (!hasMore && !loading) return null;

  return (
    <div
      ref={sentinelRef}
      className={cn(
        'flex items-center justify-center py-3',
        className
      )}
      aria-hidden="true"
    >
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Carregando mais figurinhas...</span>
        </div>
      )}
    </div>
  );
}
