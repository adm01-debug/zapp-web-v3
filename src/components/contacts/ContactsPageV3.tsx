/**
 * ContactsPageV3.tsx — ZAPP WEB v3.0
 * Complete contacts management page integrating all new features.
 * Replaces ContactsView.tsx as the main contacts route component.
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
import { sanitizeHtml } from '@/lib/sanitize';
import { type Contact } from './types';

interface ContactsPageV3Props {
  workspaceId:   string;
  onOpenChat?:   (contactId: string) => void;
}

export const ContactsPageV3: React.FC<ContactsPageV3Props> = ({
  workspaceId, onOpenChat,
}) => {
  const {
    contacts, loading, loadingMore, hasMore, total, filters,
    loadContacts, loadMore, updateFilters,
  } = useContactsPagination(workspaceId);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectAll = useCallback(() => {
    setSelectedIds(contacts.map((c) => c.id));
  }, [contacts]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const { softDeleteWithUndo } = useContactUndo({
    onCommitted: () => { clearSelection(); loadContacts(); },
    onUndone:    () => loadContacts(),
  });

  const handleBulkDelete = () => {
    softDeleteWithUndo(selectedIds, `${selectedIds.length} contato${selectedIds.length !== 1 ? 's' : ''}`);
    clearSelection();
  };

  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore(); },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const [exportOpen, setExportOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editContact, setEditContact] = useState<ContactListItem | null>(null);

  return (
    <ContactsErrorBoundary onReset={loadContacts}>
      <div className="flex flex-col h-full">
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
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="gap-1"
            >
              <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Novo contato</span>
            </Button>
          </div>
        </div>

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

          <TabsContent value="contacts" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
            <div className="p-4 border-b">
              <ContactFilterBar
                filters={filters as ContactFilters}
                onFiltersChange={updateFilters}
                totalContacts={total}
              />
            </div>

            {selectedIds.length > 0 && (
              <div className="px-4 py-2 bg-primary/5 border-b flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedIds.length} selecionado{selectedIds.length !== 1 ? 's' : ''}
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

            <div className="flex-1 overflow-hidden">
              {loading && contacts.length === 0 ? (
                <ContactsPageSkeleton />
              ) : (
                <ContactsTableVirtual
                  contacts={contacts as unknown as Contact[]}
                  selectedIds={selectedIds}
                  onSelectIds={setSelectedIds}
                  onOpenChat={(id) => onOpenChat?.(id)}
                  onEdit={(c) => setEditContact(c as unknown as ContactListItem)}
                  onDelete={(c) => softDeleteWithUndo([c.id], sanitizeHtml(c.name))}
                  loadMoreRef={loadMoreRef}
                  loadingMore={loadingMore}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="duplicates" className="p-4 overflow-y-auto">
            <DuplicateContactsPanel workspaceId={workspaceId} onMergeComplete={loadContacts} />
          </TabsContent>

          <TabsContent value="trash" className="p-4 overflow-y-auto">
            <ContactRecycleBin workspaceId={workspaceId} onRestored={() => { loadContacts(); }} />
          </TabsContent>
        </Tabs>

        <ContactExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          workspaceId={workspaceId}
          activeFilters={filters}
          selectedIds={selectedIds.length > 0 ? selectedIds : undefined}
        />

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