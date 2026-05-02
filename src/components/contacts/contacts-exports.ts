/**
 * contacts-exports.ts
 * Centralized re-exports for all Contacts Module v3.0 components and hooks.
 */

// Core UI
export { default as ContactsView }          from './ContactsView';
export { default as ContactForm }           from './ContactForm';
export { default as ContactsTable }         from './ContactsTable';
export { default as ContactEmptyState }     from './ContactEmptyState';
export { default as ContactMapView }        from './ContactMapView';
export { default as ContactBirthdayPanel }  from './ContactBirthdayPanel';
export { default as ContactPurchaseHistory}  from './ContactPurchaseHistory';
export { default as ContactImportDialog }   from './ContactImportDialog';

// v3.0 New features
export { default as ContactFilterBar }         from './ContactFilterBar';
export { default as ContactExportDialog }      from './ContactExportDialog';
export { default as ContactPhoneManager }      from './ContactPhoneManager';
export { default as ContactConsentManager }    from './ContactConsentManager';
export { default as ContactMergeDialog }       from './ContactMergeDialog';
export { default as DuplicateContactsPanel }   from './DuplicateContactsPanel';
export { default as ContactRecycleBin }        from './ContactRecycleBin';
export { default as AuditLogPanel }            from './AuditLogPanel';
export { default as ConflictResolutionDialog } from './ConflictResolutionDialog';
export { default as BulkActionsBar }           from './BulkActionsBar';
export { default as SafeHtml }                 from './SafeHtml';

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
export type { ContactListItem }        from './useContactsPagination';
export type { PotentialDuplicate }     from './useContactDuplicateDetector';
export type { ConflictInfo }           from './ConflictResolutionDialog';
