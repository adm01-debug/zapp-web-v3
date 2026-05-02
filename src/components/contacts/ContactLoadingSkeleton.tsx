/**
 * ContactLoadingSkeleton.tsx
 * Professional shimmer loading states for contacts module.
 * Prevents layout shifts and shows users content is being loaded.
 */
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ── Contact Card Skeleton ──────────────────────────────────────────────────

interface ContactCardSkeletonProps {
  className?: string;
}

export const ContactCardSkeleton: React.FC<ContactCardSkeletonProps> = ({ className }) => (
  <div className={cn('flex items-center gap-3 p-3 rounded-lg border bg-card', className)}>
    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
    <div className="flex-1 space-y-1.5 min-w-0">
      <Skeleton className="h-4 w-[55%]" />
      <Skeleton className="h-3 w-[40%]" />
    </div>
    <Skeleton className="h-7 w-16 rounded-md shrink-0" />
  </div>
);

// ── Contacts Table Skeleton ────────────────────────────────────────────────

interface ContactsTableSkeletonProps {
  rows?: number;
  className?: string;
}

export const ContactsTableSkeleton: React.FC<ContactsTableSkeletonProps> = ({
  rows = 10,
  className,
}) => (
  <div className={cn('space-y-1', className)}>
    {/* Table header */}
    <div className="flex items-center gap-4 px-4 py-2 border-b">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-3 w-[180px]" />
      <Skeleton className="h-3 w-[120px]" />
      <Skeleton className="h-3 w-[100px]" />
      <Skeleton className="h-3 w-[80px] ml-auto" />
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-4 py-2.5">
        <Skeleton className="h-4 w-4 rounded shrink-0" />
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="space-y-1">
            <Skeleton className={`h-3.5 w-[${100 + (i % 4) * 30}px]`} />
            <Skeleton className="h-3 w-[80px]" />
          </div>
        </div>
        <Skeleton className="h-3 w-[110px] shrink-0" />
        <Skeleton className="h-3 w-[90px] shrink-0" />
        <Skeleton className="h-6 w-14 rounded-full shrink-0" />
        <Skeleton className="h-7 w-7 rounded shrink-0 ml-auto" />
      </div>
    ))}
  </div>
);

// ── Contact Detail Skeleton ────────────────────────────────────────────────

export const ContactDetailSkeleton: React.FC = () => (
  <div className="space-y-4 p-4">
    {/* Header */}
    <div className="flex items-center gap-4">
      <Skeleton className="h-16 w-16 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-[200px]" />
        <Skeleton className="h-3.5 w-[140px]" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-18 rounded-full" />
        </div>
      </div>
    </div>

    <div className="h-px bg-border" />

    {/* Fields */}
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="space-y-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className={`h-9 w-full`} />
      </div>
    ))}

    {/* Action buttons */}
    <div className="flex gap-2 pt-2">
      <Skeleton className="h-9 flex-1" />
      <Skeleton className="h-9 w-24" />
    </div>
  </div>
);

// ── Contacts View Skeleton (full page) ─────────────────────────────────────

export const ContactsViewSkeleton: React.FC = () => (
  <div className="flex flex-col h-full">
    {/* Toolbar */}
    <div className="flex items-center gap-2 p-4 border-b">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-9 w-24" />
      <Skeleton className="h-9 w-9 ml-auto" />
      <Skeleton className="h-9 w-9" />
    </div>

    {/* Stats bar */}
    <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-[90px]" />
      ))}
    </div>

    {/* Table */}
    <div className="flex-1 overflow-hidden">
      <ContactsTableSkeleton rows={12} />
    </div>
  </div>
);

// ── Import Progress ────────────────────────────────────────────────────────

interface ImportProgressSkeletonProps {
  progress?: number; // 0-100
  label?: string;
}

export const ImportProgressSkeleton: React.FC<ImportProgressSkeletonProps> = ({
  progress = 0,
  label = 'Importando contatos...',
}) => (
  <div className="space-y-3 p-4">
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{Math.round(progress)}%</span>
    </div>
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className="h-full bg-primary rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  </div>
);

// ── Default export: all-in-one ──────────────────────────────────────────────

export default {
  Card:   ContactCardSkeleton,
  Table:  ContactsTableSkeleton,
  Detail: ContactDetailSkeleton,
  View:   ContactsViewSkeleton,
  Import: ImportProgressSkeleton,
};
