/**
 * contacts/index.ts — Updated barrel exports
 * All contact components and hooks exported from single entry point.
 */

// Core panels
export { Contact360Panel } from './Contact360Panel';
export type { Contact360Data } from './Contact360Panel';
export { ContactDetailPanel } from './ContactDetailPanel';
export { ContactSidebarPanel } from './ContactSidebarPanel';

// New v2 components
export { ContactInlineEdit } from './ContactInlineEdit';
export { ContactQuickNotePanel } from './ContactQuickNotePanel';
export { ContactOrphanState } from './ContactOrphanState';
export { ContactSLAIndicator } from './ContactSLAIndicator';
export type { SLAStatus } from './ContactSLAIndicator';
export { ContactDuplicateIndicator } from './ContactDuplicateIndicator';
export { ContactConversationHistory } from './ContactConversationHistory';
export { ContactBitrix24Panel } from './ContactBitrix24Panel';

// Forms
export { ContactForm } from './ContactForm';
export { ContactFormV3 } from './ContactFormV3';
export { ContactFormModal } from './ContactFormModal';
export { ContactCRMDialog } from './ContactCRMDialog';

// Table & views
export { ContactsTable } from './ContactsTable';
export { ContactsTableVirtual } from './ContactsTableVirtual';
export { ContactsView } from './ContactsView';
export { ContactsViewV3 } from './ContactsViewV3';
export { ContactKanbanView } from './ContactKanbanView';
export { ContactMapView } from './ContactMapView';
export { ContactGroupedList } from './ContactGroupedList';
export { ContactViewSwitcher } from './ContactViewSwitcher';

// List items
export { ContactCard } from './ContactCard';
export { CRMContactCard } from './CRMContactCard';
export { ContactRow } from './ContactRow';
export { ContactListItem } from './ContactListItem';
export { ContactQuickPeek } from './ContactQuickPeek';

// Phone & consent
export { ContactPhoneManager } from './ContactPhoneManager';
export type { PhoneEntry } from './ContactPhoneManager';
export { ContactConsentManager } from './ContactConsentManager';
export type { ConsentData } from './ContactConsentManager';
export { LGPDConsentManager } from './LGPDConsentManager';
export { LGPDComplianceDashboard } from './LGPDComplianceDashboard';

// Activity & audit
export { ActivityTimeline } from './ActivityTimeline';
export { ContactActivityFeed } from './ContactActivityFeed';
export { ContactActivityTimeline } from './ContactActivityTimeline';
export { AuditLogPanel } from './AuditLogPanel';
export { ContactAuditLogPanel } from './ContactAuditLogPanel';

// Filters & search
export { ContactFilterBar } from './ContactFilterBar';
export { ContactAdvancedFilters } from './ContactAdvancedFilters';
export { CRMFiltersPanel } from './CRMFiltersPanel';
export { AdvancedCRMSearch } from './AdvancedCRMSearch';
export { ContactSearchWithSuggestions } from './ContactSearchWithSuggestions';
export { FilterPresets } from './FilterPresets';

// Toolbar & actions
export { ContactToolbar } from './ContactToolbar';
export { BulkActionsBar } from './BulkActionsBar';
export { ContactBulkActionsBar } from './ContactBulkActionsBar';
export { ContactBulkTagDialog } from './ContactBulkTagDialog';

// Merge & duplicates
export { ContactMergeDialog } from './ContactMergeDialog';
export { ContactMergePanel } from './ContactMergePanel';
export { ContactDuplicatesPanel } from './ContactDuplicatesPanel';
export { DuplicateContactsPanel } from './DuplicateContactsPanel';
export { DuplicateWarningBanner } from './DuplicateWarningBanner';
export { ContactCompareDialog } from './ContactCompareDialog';
export { ConflictResolutionDialog } from './ConflictResolutionDialog';

// Import / Export
export { ContactImportDialog } from './ContactImportDialog';
export { ContactImportDialogV2 } from './ContactImportDialogV2';
export { ContactExportDialog } from './ContactExportDialog';

// Stats & analytics
export { ContactStatsCards } from './ContactStatsCards';
export { ContactStatsDashboard } from './ContactStatsDashboard';
export { ContactsStatsBar } from './ContactsStatsBar';
export { ContactAnalyticsDashboard } from './ContactAnalyticsDashboard';
export { ContactEngagementScore } from './ContactEngagementScore';
export { ContactBirthdayPanel } from './ContactBirthdayPanel';
export { ContactPurchaseHistory } from './ContactPurchaseHistory';

// States & skeletons
export { ContactEmptyState } from './ContactEmptyState';
export { ContactRowSkeleton as ContactSkeleton } from './ContactSkeleton';
export { ContactRowSkeleton as ContactSkeletonLoader } from './ContactSkeletonLoader';
export { ContactsSkeleton } from './ContactsSkeleton';
export { ContactCardSkeleton as ContactLoadingSkeleton } from './ContactLoadingSkeleton';

// Error boundaries
export { ContactErrorBoundary } from './ContactErrorBoundary';
export { ContactsErrorBoundary } from './ContactsErrorBoundary';

// UI helpers
export { SafeHtml } from './SafeHtml';
export { InlineEditCell } from './InlineEditCell';
export { HighlightText } from './HighlightText';
export { CompanyLogo } from './CompanyLogo';
export { CustomFieldsSection } from './CustomFieldsSection';
export { ContactNotes } from './ContactNotes';
export { ContactNotesPanel } from './ContactNotesPanel';

// Pagination
export { ContactPagination } from './ContactPagination';
export { ContactResultsSummary } from './ContactResultsSummary';

// Pages
export { ContactsPageV3 } from './ContactsPageV3';
export { ContactContentArea } from './ContactContentArea';
export { ContactDialogs } from './ContactDialogs';
export { ContactsRecycleBin } from './ContactsRecycleBin';
export { ContactRecycleBin } from './ContactRecycleBin';

// Hooks (re-exported from components dir for backwards compat)
export { useContactActivityFeed } from './useContactActivityFeed';
export { useContactDuplicateDetector } from './useContactDuplicateDetector';
export { useContactFormValidation } from './useContactFormValidation';
export { useContactRetry } from './useContactRetry';
export { useContactUndo } from './useContactUndo';
export { useContactUndoDelete } from './useContactUndoDelete';
export { useContactsCRUD } from './useContactsCRUD';
export { useContactsPagination } from './useContactsPagination';
export { useContactsPaginationV2 } from './useContactsPaginationV2';
export { useContactsStats } from './useContactsStats';
export { useContactsViewState } from './useContactsViewState';
export { useDuplicateDetector } from './useDuplicateDetector';

// Config
export { CONTACT_TYPE_CONFIG as contactTypeConfig } from './contactTypeConfig';
export type { Contact as ContactType } from './types';
