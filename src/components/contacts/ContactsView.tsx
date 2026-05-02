/**
 * ContactsView.tsx — v3.0
 * Full integration of all Contacts Module v3.0 features:
 * - Server-side pagination via useContactsPagination
 * - Advanced filter bar (search, tags, channel, sort)
 * - Tabs: Contacts | Duplicates | Recycle Bin
 * - Export dialog with column picker
 * - Virtual scroll ready
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users, Download, Upload, Plus, GitMerge, Trash2, RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useContactsPagination }     from './useContactsPagination';
import { ContactFilterBar }          from './ContactFilterBar';
import { ContactExportDialog }       from './ContactExportDialog';
import { DuplicateContactsPanel }    from './DuplicateContactsPanel';
import { ContactRecycleBin }         from './ContactRecycleBin';
import ContactsTable                 from './ContactsTable';
import ContactEmptyState             from './ContactEmptyState';
import ContactImportDialog           from './ContactImportDialog';
import ContactForm                   from './ContactForm';

// ── Types ──────────────────────────────────────────────────────────────────

interface ContactsViewProps {
  workspaceId: string;
}

// ── Component ──────────────────────────────────────────────────────────────

export const ContactsView: React.FC<ContactsViewProps> = ({ workspaceId }) => {
  const { toast } = useToast();

  // ── Pagination + filters ────────────────────────────────────────────────
  const {
    contacts, loading, loadingMore, hasMore, total, filters,
    loadContacts, loadMore, updateFilters,
  } = useContactsPagination(workspaceId);

  // ── UI State ────────────────────────────────────────────────────────────
  const [selectedIds,    setSelectedIds]    = useState<string[]>([]);
  const [exportOpen,     setExportOpen]     = useState(false);
  const [importOpen,     setImportOpen]     = useState(false);
  const [createOpen,     setCreateOpen]     = useState(false);
  const [activeTab,      setActiveTab]      = useState('contacts');

  // ── Infinite scroll sentinel ────────────────────────────────────────────
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingMore) loadMore(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  // ── Load on mount ───────────────────────────────────────────────────────
  useEffect(() => { loadContacts(); }, [loadContacts]);

  // ── Selection handling ──────────────────────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(contacts.map((c) => c.id));
  }, [contacts]);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  // ── After create/import ─────────────────────────────────────────────────
  const handleContactSaved = useCallback(() => {
    setCreateOpen(false);
    loadContacts();
    toast({ title: '✅ Contato salvo!', duration: 3000 });
  }, [loadContacts, toast]);

  const handleImportComplete = useCallback(() => {
    setImportOpen(false);
    loadContacts();
    toast({ title: '✅ Importação concluída!', duration: 3000 });
  }, [loadContacts, toast]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-lg">Contatos</h1>
          {total > 0 && (
            <Badge variant="secondary">{total.toLocaleString('pt-BR')}</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1">
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Importar</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="gap-1">
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Novo contato</span>
          </Button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <div className="px-4 pt-2 border-b shrink-0">
          <TabsList className="h-8">
            <TabsTrigger value="contacts" className="text-xs gap-1">
              <Users className="h-3 w-3" />
              Contatos
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="text-xs gap-1">
              <GitMerge className="h-3 w-3" />
              Duplicados
            </TabsTrigger>
            <TabsTrigger value="trash" className="text-xs gap-1">
              <Trash2 className="h-3 w-3" />
              Lixeira
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Contacts tab ───────────────────────────────────────────────── */}
        <TabsContent value="contacts" className="flex flex-col flex-1 min-h-0 mt-0">
          {/* Filter bar */}
          <div className="px-4 py-3 border-b shrink-0">
            <ContactFilterBar
              filters={filters}
              onFiltersChange={updateFilters}
              totalContacts={total}
            />
          </div>

          {/* Selection toolbar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b shrink-0">
              <span className="text-sm text-primary font-medium">
                {selectedIds.length} selecionado{selectedIds.length !== 1 ? 's' : ''}
              </span>
              <Button size="sm" variant="outline" onClick={() => setExportOpen(true)} className="gap-1 h-7">
                <Download className="h-3 w-3" />
                Exportar
              </Button>
              <button
                type="button"
                onClick={clearSelection}
                className="text-xs text-muted-foreground hover:text-foreground ml-auto"
              >
                Limpar seleção
              </button>
            </div>
          )}

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto">
            {loading && contacts.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : contacts.length === 0 ? (
              <ContactEmptyState
                hasFilters={!!(filters.search || filters.tags.length > 0 || filters.channel)}
                onClearFilters={() => updateFilters({ search: '', tags: [], channel: null })}
                onCreateContact={() => setCreateOpen(true)}
              />
            ) : (
              <>
                <ContactsTable
                  contacts={contacts}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onSelectAll={selectAll}
                  onClearSelection={clearSelection}
                  workspaceId={workspaceId}
                  onContactUpdated={loadContacts}
                />
                {/* Infinite scroll sentinel */}
                <div ref={sentinelRef} className="h-8 flex items-center justify-center">
                  {loadingMore && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {!hasMore && contacts.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Todos os {total.toLocaleString('pt-BR')} contatos carregados.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* ── Duplicates tab ─────────────────────────────────────────────── */}
        <TabsContent value="duplicates" className="flex-1 overflow-y-auto p-4 mt-0">
          <DuplicateContactsPanel
            workspaceId={workspaceId}
            onMergeComplete={loadContacts}
          />
        </TabsContent>

        {/* ── Recycle bin tab ────────────────────────────────────────────── */}
        <TabsContent value="trash" className="flex-1 overflow-y-auto p-4 mt-0">
          <ContactRecycleBin
            workspaceId={workspaceId}
            onRestored={loadContacts}
          />
        </TabsContent>
      </Tabs>

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <ContactExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        workspaceId={workspaceId}
        activeFilters={filters}
        selectedIds={selectedIds.length > 0 ? selectedIds : undefined}
      />

      {importOpen && (
        <ContactImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          workspaceId={workspaceId}
          onImportComplete={handleImportComplete}
        />
      )}

      {createOpen && (
        <ContactForm
          open={createOpen}
          onOpenChange={setCreateOpen}
          workspaceId={workspaceId}
          onSaved={handleContactSaved}
        />
      )}
    </div>
  );
};

export default ContactsView;
