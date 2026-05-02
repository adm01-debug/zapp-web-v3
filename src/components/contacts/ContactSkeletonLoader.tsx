/**
 * ContactSkeletonLoader.tsx
 * Loading skeleton components for contacts module.
 * Used while data is being fetched.
 */
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Single contact row skeleton ────────────────────────────────────────────

export const ContactRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-2.5 px-4 py-2.5 border-b" aria-hidden="true">
    <Skeleton className="h-4 w-4 rounded shrink-0" />
    <Skeleton className="h-9 w-9 rounded-full shrink-0" />
    <div className="flex-1 space-y-1.5 min-w-0">
      <div className="flex items-center gap-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <Skeleton className="h-4 w-12 hidden lg:block" />
    <Skeleton className="h-7 w-7 rounded" />
  </div>
);

// ── Full page skeleton (multiple rows) ────────────────────────────────────

export const ContactsPageSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div aria-label="Carregando contatos..." aria-busy="true">
    <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/30 border-b">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-3 w-16 ml-auto" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <ContactRowSkeleton key={i} />
    ))}
  </div>
);

// ── Contact sidebar skeleton ──────────────────────────────────────────────

export const ContactSidebarSkeleton: React.FC = () => (
  <div className="p-4 space-y-4" aria-hidden="true">
    <div className="flex items-start gap-3">
      <Skeleton className="h-14 w-14 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
        <div className="flex gap-1.5">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
      </div>
    </div>
    <div className="space-y-2">
      {[1,2,3].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-3.5 shrink-0" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
    <Skeleton className="h-9 w-full rounded-lg" />
  </div>
);

// ── Stats dashboard skeleton ──────────────────────────────────────────────

export const StatsDashboardSkeleton: React.FC = () => (
  <div className="space-y-3" aria-hidden="true">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[1,2,3,4].map((i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
    <div className="flex gap-2 flex-wrap">
      {[1,2,3,4].map((i) => <Skeleton key={i} className="h-6 w-24 rounded-full" />)}
    </div>
  </div>
);
