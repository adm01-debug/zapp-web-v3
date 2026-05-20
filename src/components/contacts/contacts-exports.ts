/**
 * contacts-exports.ts
 * Centralized re-exports for all Contacts Module v3.0 components and hooks.
 */

// Core UI
export { ContactsRichView as ContactsView }   from './ContactsRichView';
export { ContactFormV3 as ContactForm }       from './ContactFormV3';
export { ContactsTable }                      from './ContactsTable';
export { ContactEmptyState }                  from './ContactEmptyState';
export { ContactMapView }                     from './ContactMapView';
export { ContactBirthdayPanel }               from './ContactBirthdayPanel';
export { ContactPurchaseHistory }             from './ContactPurchaseHistory';
export { ContactImportDialog }                from './ContactImportDialog';

// v3.0 New features
export { ContactFilterBar }         from './ContactFilterBar';
export { ContactExportDialog }      from './ContactExportDialog';
export { ContactPhoneManager }      from './ContactPhoneManager';
export { ContactConsentManager }    from './ContactConsentManager';
export { ContactMergeDialog }       from './ContactMergeDialog';
export { DuplicateContactsPanel }   from './DuplicateContactsPanel';
export { ContactRecycleBin }        from './ContactRecycleBin';
export { AuditLogPanel }            from './AuditLogPanel';
export { ConflictResolutionDialog } from './ConflictResolutionDialog';
export { BulkActionsBar }           from './BulkActionsBar';
export { SafeHtml }                 from './SafeHtml';

// Hooks
export { useContactsCRUD }             from './useContactsCRUD';
export { useContactFormValidation }    from './useContactFormValidation';
export { useContactsViewState }        from './useContactsViewState';
export { useContactsPagination }       from './useContactsPagination';
export { useContactDuplicateDetector } from './useContactDuplicateDetector';
export { useContactUndo }              from './useContactUndo';

// Types
export type { ContactForMerge }        from './ContactMergeDialog';
export type { PhoneEntry }             from './ContactPhoneManager';
export type { ConsentData }            from './ContactConsentManager';
export type { ContactFilters }         from './ContactFilterBar';
export type { PotentialDuplicate }     from './useContactDuplicateDetector';
export type { ConflictInfo }           from './ConflictResolutionDialog';
