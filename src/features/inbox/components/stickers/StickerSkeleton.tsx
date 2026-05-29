import { cn } from '@/lib/utils';

interface StickerSkeletonProps {
  gridSize: 'sm' | 'md' | 'lg';
  count?: number;
}

const gridColsMap = {
  sm: 'grid-cols-5',
  md: 'grid-cols-4',
  lg: 'grid-cols-3',
};

/**
 * Skeleton loading state for the sticker grid.
 * Shows pulsing placeholders that match the real grid layout.
 * GAP 15 fix: Eliminates the jarring flash between loading and loaded states.
 */
export function StickerSkeleton({ gridSize, count = 12 }: StickerSkeletonProps) {
  return (
    <div className="p-2" role="status" aria-label="Carregando figurinhas">
      <div className={cn('grid gap-1.5', gridColsMap[gridSize])}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'aspect-square rounded-lg overflow-hidden',
              'bg-muted/40 animate-pulse',
              'border border-border/20'
            )}
            style={{
              animationDelay: `${i * 50}ms`,
              animationDuration: '1.5s',
            }}
          >
            {/* Inner sticker placeholder */}
            <div className="w-full h-full flex items-center justify-center">
              <div className={cn(
                'rounded-md bg-muted/60',
                gridSize === 'sm' ? 'w-8 h-8' : gridSize === 'md' ? 'w-10 h-10' : 'w-14 h-14'
              )} />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Carregando figurinhas...</span>
    </div>
  );
}
