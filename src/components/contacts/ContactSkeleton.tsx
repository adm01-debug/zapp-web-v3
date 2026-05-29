/**
 * ContactSkeleton.tsx
 * Loading skeleton placeholders for the contacts list.
 * Prevents layout shift and provides visual feedback during data load.
 */
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Contact row skeleton ───────────────────────────────────────────────────

export const ContactRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0">
    {/* Checkbox */}
    <Skeleton className="h-4 w-4 rounded shrink-0" />
    {/* Avatar */}
    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
    {/* Name + phone */}
    <div className="flex-1 space-y-1.5 min-w-0">
      <Skeleton className="h-4 w-36 rounded" />
      <Skeleton className="h-3 w-28 rounded" />
    </div>
    {/* Email */}
    <div className="hidden sm:block flex-1">
      <Skeleton className="h-3 w-40 rounded" />
    </div>
    {/* Tags */}
    <div className="hidden md:flex gap-1">
      <Skeleton className="h-5 w-12 rounded-full" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    {/* Channel badge */}
    <Skeleton className="h-5 w-20 rounded-full shrink-0" />
    {/* Actions */}
    <Skeleton className="h-7 w-7 rounded shrink-0" />
  </div>
);

// ── Contact list skeleton ──────────────────────────────────────────────────

export const ContactListSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div className="divide-y">
    {Array.from({ length: rows }, (_, i) => (
      <ContactRowSkeleton key={i} />
    ))}
  </div>
);

// ── Contact card skeleton (grid view) ─────────────────────────────────────

export const ContactCardSkeleton: React.FC = () => (
  <div className="rounded-lg border p-4 space-y-3">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
    </div>
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-36 rounded" />
      <Skeleton className="h-3 w-32 rounded" />
    </div>
    <div className="flex gap-1">
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-5 w-10 rounded-full" />
    </div>
  </div>
);

export const ContactGridSkeleton: React.FC<{ cards?: number }> = ({ cards = 12 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
    {Array.from({ length: cards }, (_, i) => (
      <ContactCardSkeleton key={i} />
    ))}
  </div>
);

// ── Contact detail skeleton (side panel) ──────────────────────────────────

export const ContactDetailSkeleton: React.FC = () => (
  <div className="space-y-5 p-4">
    {/* Header */}
    <div className="flex items-center gap-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-36 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>

    {/* Info fields */}
    <div className="space-y-3">
      {[80, 72, 64, 56].map((w) => (
        <div key={w} className="flex gap-3">
          <Skeleton className="h-4 w-4 rounded shrink-0 mt-0.5" />
          <Skeleton className={`h-4 w-${w} rounded flex-1`} />
        </div>
      ))}
    </div>

    {/* Tags */}
    <div className="flex flex-wrap gap-1.5">
      {[16, 20, 14].map((w) => (
        <Skeleton key={w} className={`h-6 w-${w} rounded-full`} />
      ))}
    </div>

    {/* Tabs */}
    <div className="flex gap-2 border-b pb-2">
      {[3, 2, 4].map((i) => (
        <Skeleton key={i} className="h-8 w-20 rounded" />
      ))}
    </div>

    {/* Content */}
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  </div>
);

// ── Filter bar skeleton ────────────────────────────────────────────────────

export const ContactFilterBarSkeleton: React.FC = () => (
  <div className="flex items-center gap-2 p-4">
    <Skeleton className="h-9 flex-1 rounded-md" />
    <Skeleton className="h-9 w-48 rounded-md" />
    <Skeleton className="h-9 w-9 rounded-md" />
  </div>
);
