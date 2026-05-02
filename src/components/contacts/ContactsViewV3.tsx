/**
 * ContactsViewV3.tsx
 * Main contacts management page — fully integrated v3.0.
 * Uses server-side pagination, advanced filters, and all new panels.
 */
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  UserPlus, Download, Trash2, Users, GitMerge,
} from 'lucide-react';

// v3.0 hooks + components
import { useContactsPagination } from './useContactsPagination';
import { useContactUndo } from './useContactUndo';
import { ContactFilterBar } from './ContactFilterBar';
import { ContactExportDialog } from './ContactExportDialog';
import { DuplicateContactsPanel } from './DuplicateContactsPanel';
import { ContactRecycleBin } from './ContactRecycleBin';
import { ContactFormV3 } from './ContactFormV3';
import { BulkActionsBar } from './BulkActionsBar';
import { ContactsTable } from './ContactsTable';
import { ContactEmptyState } from './ContactEmptyState';

// ── Types ──────────────────────────────────────────────────────────────────

interface ContactsViewV3Props {
  workspaceId: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export const ContactsViewV3: React.FC<ContactsViewV3Props> = ({ workspaceId }) => {
  const [activeTab,      setActiveTab]      = useState('contacts');
  const [selectedIds,    setSelectedIds]    = useState<string[]>([]);
  const [createOpen,     setCreateOpen]     = useState(false);
  const [exportOpen,     setExportOpen]     = useState(false);
  const [editContactId,  setEditContactId]  = useState<string | null>(null);

  // Server-side pagination + filters
  const {
    contacts, loading, loadingMore, total,
    filters, loadContacts, updateFilters,
  } = useContactsPagination(workspaceId);

  // Undo-aware bulk delete
  const { softDeleteWithUndo } = useContactUndo({
    onCommitted: (ids) => {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      loadContacts();
    },
    onUndone: () => loadContacts(),
  });

  // Load on mount
  useEffect(() => { loadContacts(); }, [loadContacts]);

  const handleContactSaved = () => {
    setCreateOpen(false);
    setEditContactId(null);
    loadContacts();
  };

  // Contact selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const selectAll  = () => setSelectedIds(contacts.map((c) => c.id));
  const clearSelection = () => setSelectedIds([]);

  // Get available tags from current contacts (for filter)
  const availableTags = [...new Set(contacts.flatMap((c) => c.tags))].sort();

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 p-4 border-b shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-semibold text-lg">Contatos</h1>
          <Badge variant="outline" className="text-xs font-mono">
            {total.toLocaleString('pt-BR')}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="gap-1">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo contato</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-4 mt-2 shrink-0 justify-start">
          <TabsTrigger value="contacts" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Todos
          </TabsTrigger>
          <TabsTrigger value="duplicates" className="gap-1.5">
            <GitMerge className="h-3.5 w-3.5" />
            Duplicados
          </TabsTrigger>
          <TabsTrigger value="trash" className="gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Lixeira
          </TabsTrigger>
        </TabsList>

        {/* ── TAB: Contacts ────────────────────────────────────────────── */}
        <TabsContent value="contacts" className="flex flex-col flex-1 min-h-0 mt-0">
          {/* Filter bar */}
          <div className="px-4 py-3 border-b shrink-0">
            <ContactFilterBar
              filters={filters}
              onFiltersChange={updateFilters}
              availableTags={availableTags}
              totalContacts={total}
            />
          </div>

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <div className="px-4 py-2 bg-primary/5 border-b shrink-0">
              <BulkActionsBar
                selectedIds={selectedIds}
                workspaceId={workspaceId}
                onClearSelection={clearSelection}
                onSelectAll={selectAll}
                onDeleted={() => loadContacts()}
                totalCount={contacts.length}
              />
            </div>
          )}

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground">
                <div className="text-center space-y-2">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
                  <p className="text-sm">Carregando contatos...</p>
                </div>
              </div>
            ) : contacts.length === 0 ? (
              <ContactEmptyState type="no-contacts" onAddContact={() => setCreateOpen(true)} />
            ) : (
              <ContactsTable
                contacts={contacts.map((contact) => ({
                  id: contact.id,
                  name: contact.name,
                  surname: null,
                  nickname: null,
                  phone: contact.phone ?? '',
                  email: contact.email,
                  avatar_url: contact.avatar_url,
                  company: contact.company,
                  job_title: null,
                  tags: contact.tags,
                  contact_type: null,
                  created_at: contact.created_at,
                }))}
                selectedIds={selectedIds}
                onSelectIds={setSelectedIds}
                onOpenChat={() => {}}
                onEdit={(contact) => setEditContactId(contact.id)}
                onDelete={(contact) => softDeleteWithUndo([contact.id], contact.name)}
              />
            )}

            {/* Load more indicator */}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── TAB: Duplicates ──────────────────────────────────────────── */}
        <TabsContent value="duplicates" className="flex-1 overflow-y-auto p-4 mt-0">
          <DuplicateContactsPanel
            workspaceId={workspaceId}
            onMergeComplete={() => loadContacts()}
          />
        </TabsContent>

        {/* ── TAB: Trash ───────────────────────────────────────────────── */}
        <TabsContent value="trash" className="flex-1 overflow-y-auto p-4 mt-0">
          <ContactRecycleBin
            workspaceId={workspaceId}
            onRestored={() => loadContacts()}
          />
        </TabsContent>
      </Tabs>

      {/* Create contact dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Novo Contato
            </DialogTitle>
          </DialogHeader>
          <ContactFormV3
            workspaceId={workspaceId}
            mode="create"
            onSaved={handleContactSaved}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit contact sheet */}
      <Sheet open={!!editContactId} onOpenChange={(v) => { if (!v) setEditContactId(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Contato</SheetTitle>
          </SheetHeader>
          {editContactId && (
            <div className="mt-4">
              <ContactFormV3
                workspaceId={workspaceId}
                mode="edit"
                initial={{ id: editContactId }}
                onSaved={handleContactSaved}
                onCancel={() => setEditContactId(null)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Export dialog */}
      <ContactExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        workspaceId={workspaceId}
        activeFilters={filters}
        selectedIds={selectedIds.length > 0 ? selectedIds : undefined}
      />
    </div>
  );
};

export default ContactsViewV3;
