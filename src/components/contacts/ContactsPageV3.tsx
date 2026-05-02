/**
 * ContactsPageV3.tsx — ZAPP WEB v3.0
 * Complete contacts management page integrating all new features.
 * Replaces ContactsView.tsx as the main contacts route component.
 *
 * Features:
 * ✅ Server-side pagination (useContactsPagination)
 * ✅ Advanced filter bar (ContactFilterBar)
 * ✅ Virtual scroll table (ContactsTableVirtual)
 * ✅ Skeleton loading states (ContactsPageSkeleton)
 * ✅ Bulk actions with undo toast (BulkActionsBar + useContactUndo)
 * ✅ Export dialog (ContactExportDialog)
 * ✅ Duplicate scan tab (DuplicateContactsPanel)
 * ✅ Recycle bin tab (ContactRecycleBin)
 * ✅ Error boundary (ContactsErrorBoundary)
 * ✅ Infinite scroll loadMore
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Users, UserPlus, Download, Trash2, Merge } from 'lucide-react';
import { useContactsPagination } from './useContactsPagination';
import { useContactUndo } from './useContactUndo';
import ContactFilterBar, { type ContactFilters } from './ContactFilterBar';
import ContactsTableVirtual from './ContactsTableVirtual';
import ContactExportDialog from './ContactExportDialog';
import DuplicateContactsPanel from './DuplicateContactsPanel';
import ContactRecycleBin from './ContactRecycleBin';
import ContactsErrorBoundary from './ContactsErrorBoundary';
import { ContactsPageSkeleton } from './ContactSkeletonLoader';
import { ContactFormV3 } from './ContactFormV3';
import { type ContactListItem } from './useContactsPagination';
import { sanitizeHtml, sanitizeText } from '@/lib/sanitize';
import { useToast } from '@/hooks/use-toast';

// ── Types ──────────────────────────────────────────────────────────────────

interface ContactsPageV3Props {
  workspaceId:   string;
  onOpenChat?:   (contactId: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export const ContactsPageV3: React.FC<ContactsPageV3Props> = ({
  workspaceId, onOpenChat,
}) => {
  // Pagination + search
  const {
    contacts, loading, loadingMore, hasMore, total, filters,
    loadContacts, loadMore, updateFilters,
  } = useContactsPagination(workspaceId);

  // Load on mount
  useEffect(() => { loadContacts(); }, [loadContacts]);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(contacts.map((c) => c.id)));
  }, [contacts]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Undo-aware delete
  const { softDeleteWithUndo } = useContactUndo({
    onCommitted: () => { clearSelection(); loadContacts(); },
    onUndone:    () => loadContacts(),
  });

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    softDeleteWithUndo(ids, `${ids.length} contato${ids.length !== 1 ? 's' : ''}`);
    // Optimistic: remove from list immediately
    clearSelection();
  };

  // Infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore(); },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  // Dialogs
  const [exportOpen, setExportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editContact, setEditContact] = useState<ContactListItem | null>(null);

  return (
    <ContactsErrorBoundary onReset={loadContacts}>
      <div className="flex flex-col h-full">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h1 className="font-semibold text-base">Contatos</h1>
            {total > 0 && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {total.toLocaleString('pt-BR')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExportOpen(true)}
              className="gap-1"
              aria-label="Exportar contatos"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-1"
              aria-label="Criar novo contato"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Novo contato</span>
            </Button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="contacts" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-4">
            <TabsList className="h-9 bg-transparent p-0 gap-4">
              <TabsTrigger value="contacts" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0">
                <Users className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Todos
              </TabsTrigger>
              <TabsTrigger value="duplicates" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0">
                <Merge className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Duplicados
              </TabsTrigger>
              <TabsTrigger value="trash" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none px-0">
                <Trash2 className="h-3.5 w-3.5 mr-1" aria-hidden="true" />Lixeira
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Contacts Tab ── */}
          <TabsContent value="contacts" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
            <div className="p-4 border-b">
              <ContactFilterBar
                filters={filters as ContactFilters}
                onFiltersChange={updateFilters}
                totalContacts={total}
              />
            </div>

            {/* Bulk actions bar */}
            {selectedIds.size > 0 && (
              <div className="px-4 py-2 bg-primary/5 border-b flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
                </span>
                <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="gap-1 ml-2">
                  <Download className="h-3.5 w-3.5" />Exportar
                </Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-1">
                  <Trash2 className="h-3.5 w-3.5" />Excluir
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection} className="ml-auto">
                  Cancelar
                </Button>
              </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-hidden">
              {loading && contacts.length === 0 ? (
                <ContactsPageSkeleton />
              ) : (
                <ContactsTableVirtual
                  contacts={contacts}
                  selectedIds={selectedIds}
                  onSelectToggle={toggleSelect}
                  onSelectAll={selectAll}
                  onClearSelection={clearSelection}
                  onOpenChat={(c) => onOpenChat?.(c.id)}
                  onEdit={(c) => setEditContact(c)}
                  onDelete={(c) => softDeleteWithUndo([c.id], sanitizeHtml(c.name))}
                  loadMoreRef={loadMoreRef}
                  loadingMore={loadingMore}
                />
              )}
            </div>
          </TabsContent>

          {/* ── Duplicates Tab ── */}
          <TabsContent value="duplicates" className="p-4 overflow-y-auto">
            <DuplicateContactsPanel workspaceId={workspaceId} onMergeComplete={loadContacts} />
          </TabsContent>

          {/* ── Trash Tab ── */}
          <TabsContent value="trash" className="p-4 overflow-y-auto">
            <ContactRecycleBin workspaceId={workspaceId} onRestored={() => { loadContacts(); }} />
          </TabsContent>
        </Tabs>

        {/* ── Export Dialog ── */}
        <ContactExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          workspaceId={workspaceId}
          activeFilters={filters}
          selectedIds={selectedIds.size > 0 ? Array.from(selectedIds) : undefined}
        />

        {/* ── Create Contact Sheet ── */}
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" aria-hidden="true" />
                Novo Contato
              </SheetTitle>
            </SheetHeader>
            <ContactFormV3
              workspaceId={workspaceId}
              onSaved={() => { setCreateOpen(false); loadContacts(); }}
              onCancel={() => setCreateOpen(false)}
            />
          </SheetContent>
        </Sheet>

        {/* ── Edit Contact Sheet ── */}
        <Sheet open={!!editContact} onOpenChange={(v) => { if (!v) setEditContact(null); }}>
          <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto">
            <SheetHeader className="mb-4">
              <SheetTitle>Editar Contato</SheetTitle>
            </SheetHeader>
            {editContact && (
              <ContactFormV3
                workspaceId={workspaceId}
                initial={editContact as unknown as Partial<import('./ContactFormV3').ContactV3FormData>}
                mode="edit"
                onSaved={() => { setEditContact(null); loadContacts(); }}
                onCancel={() => setEditContact(null)}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </ContactsErrorBoundary>
  );
};

export default ContactsPageV3;
