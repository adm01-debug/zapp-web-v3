/**
 * ContactSkeletonLoader.tsx
 * Skeleton loading states for the contacts module.
 * Prevents layout shift and signals loading progress to users.
 * WCAG: aria-busy + aria-label for screen readers.
 */
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// ── Contact Row Skeleton ───────────────────────────────────────────────────

export const ContactRowSkeleton: React.FC = () => (
  <div className="flex items-center gap-3 px-4 py-3 border-b" aria-hidden="true">
    <Skeleton className="h-4 w-4 rounded" />               {/* checkbox */}
    <Skeleton className="h-9 w-9 rounded-full shrink-0" />  {/* avatar */}
    <div className="flex-1 space-y-1.5">
      <Skeleton className="h-3.5 w-32" />                  {/* name */}
      <Skeleton className="h-3 w-48" />                    {/* phone/email */}
    </div>
    <div className="hidden lg:flex gap-1">
      <Skeleton className="h-5 w-14 rounded-full" />        {/* tag 1 */}
      <Skeleton className="h-5 w-10 rounded-full" />        {/* tag 2 */}
    </div>
    <Skeleton className="hidden md:block h-3 w-12" />       {/* last seen */}
    <Skeleton className="h-7 w-7 rounded" />               {/* action btn */}
  </div>
);

// ── Contact Table Skeleton ─────────────────────────────────────────────────

export const ContactTableSkeleton: React.FC<{ rows?: number }> = ({ rows = 8 }) => (
  <div role="status" aria-label="Carregando contatos..." aria-busy="true">
    {/* Header skeleton */}
    <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b" aria-hidden="true">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-3 w-36" />
    </div>
    {/* Row skeletons */}
    {Array.from({ length: rows }).map((_, i) => (
      <ContactRowSkeleton key={i} />
    ))}
    <span className="sr-only">Carregando lista de contatos...</span>
  </div>
);

// ── Contact Card Skeleton (for grid view) ──────────────────────────────────

export const ContactCardSkeleton: React.FC = () => (
  <div className="rounded-lg border p-4 space-y-3" aria-hidden="true">
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-3/4" />
    <div className="flex gap-1 pt-1">
      <Skeleton className="h-5 w-14 rounded-full" />
      <Skeleton className="h-5 w-10 rounded-full" />
    </div>
  </div>
);

// ── Contact Detail Skeleton (for 360° panel) ───────────────────────────────

export const ContactDetailSkeleton: React.FC = () => (
  <div className="space-y-4 p-4" role="status" aria-label="Carregando detalhes do contato..." aria-busy="true">
    <div className="flex items-center gap-3">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
    <div className="space-y-2 pt-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded shrink-0" />
          <Skeleton className="h-3.5 w-full" />
        </div>
      ))}
    </div>
    <div className="space-y-2 pt-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-24 w-full rounded-lg" />
    </div>
    <span className="sr-only">Carregando informações do contato...</span>
  </div>
);

// ── Contacts Page Skeleton (full page loading) ─────────────────────────────

export const ContactsPageSkeleton: React.FC = () => (
  <div className="flex flex-col h-full gap-4 p-4" role="status" aria-label="Carregando módulo de contatos..." aria-busy="true">
    {/* Filter bar skeleton */}
    <div className="flex gap-2">
      <Skeleton className="h-9 flex-1" />
      <Skeleton className="h-9 w-48" />
      <Skeleton className="h-9 w-9" />
    </div>
    {/* Table */}
    <ContactTableSkeleton rows={10} />
    <span className="sr-only">Aguarde, carregando contatos...</span>
  </div>
);
