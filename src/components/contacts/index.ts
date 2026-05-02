/**
 * index.ts — Contacts Module Barrel Export
 * Clean public API for the contacts module.
 * Import anything contacts-related from this single entry point.
 *
 * @example
 * import { ContactMergeDialog, useContactUndo, ContactsRecycleBin } from '@/components/contacts';
 */

// ── UI Components ──────────────────────────────────────────────────────────
export { default as ContactForm }              from './ContactForm';
export { default as ContactsView }             from './ContactsView';
export { default as ContactsTable }            from './ContactsTable';
export { default as ContactMapView }           from './ContactMapView';
export { default as ContactBirthdayPanel }     from './ContactBirthdayPanel';
export { default as ContactImportDialog }      from './ContactImportDialog';
export { default as ContactEmptyState }        from './ContactEmptyState';
export { default as ContactPurchaseHistory }   from './ContactPurchaseHistory';
export { default as ContactSearchWithSuggestions } from './ContactSearchWithSuggestions';
export { default as BulkActionsBar }           from './BulkActionsBar';
export { default as FilterPresets }            from './FilterPresets';
export { default as CustomFieldsSection }      from './CustomFieldsSection';
export { default as ContactResultsSummary }    from './ContactResultsSummary';

// ── New Sprint Components ──────────────────────────────────────────────────
export { default as SafeHtml }                 from './SafeHtml';
export { default as ContactMergeDialog }       from './ContactMergeDialog';
export type { ContactForMerge }                from './ContactMergeDialog';
export { default as ContactConsentManager }    from './ContactConsentManager';
export type { ConsentData }                    from './ContactConsentManager';
export { default as ContactPhoneManager }      from './ContactPhoneManager';
export type { PhoneEntry }                     from './ContactPhoneManager';
export { default as ContactsRecycleBin }       from './ContactsRecycleBin';
export { default as ContactDuplicatesPanel }   from './ContactDuplicatesPanel';
export { default as ContactAuditLogPanel }     from './ContactAuditLogPanel';
export { default as DuplicateWarningBanner }   from './DuplicateWarningBanner';
export { default as ContactsStatsBar }         from './ContactsStatsBar';
export {
  ContactCardSkeleton,
  ContactsTableSkeleton,
  ContactDetailSkeleton,
  ContactsViewSkeleton,
  ImportProgressSkeleton,
} from './ContactLoadingSkeleton';

// ── Hooks ──────────────────────────────────────────────────────────────────
export { useContactsCRUD }                     from './useContactsCRUD';
export { useContactsViewState }                from './useContactsViewState';
export { useContactFormValidation }            from './useContactFormValidation';
export { default as useContactUndo }           from './useContactUndo';
export { default as useContactRetry }          from './useContactRetry';
export { useContactDuplicateDetector }         from './useContactDuplicateDetector';
export type { PotentialDuplicate }             from './useContactDuplicateDetector';
export { useContactsPagination }               from './useContactsPagination';
export type { ContactListItem }                from './useContactsPagination';
export { useContactsStats }                    from './useContactsStats';
export type { ContactsStats }                  from './useContactsStats';

// ── Types ──────────────────────────────────────────────────────────────────
export type * from './types';
