/**
 * ContactsView.tsx — ZAPP WEB v3.1
 * Complete contacts page with evolution_contacts schema.
 * Updated to include Import button + ContactImportDialogV2.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users, UserPlus, Search, Download, Trash2, GitMerge,
  SlidersHorizontal, X, ArrowUpDown, RefreshCw, CheckSquare, Upload,
} from 'lucide-react';
import { useContacts, type Contact, type ContactFilters } from '@/hooks/useContacts';
import { ContactsErrorBoundary } from '@/components/contacts/ContactsErrorBoundary';
import { ContactsPageSkeleton } from '@/components/contacts/ContactSkeletonLoader';
import DuplicateContactsPanel from '@/components/contacts/DuplicateContactsPanel';
import ContactRecycleBin from '@/components/contacts/ContactRecycleBin';
import ContactExportDialog from '@/components/contacts/ContactExportDialog';
import ContactFormModal from '@/components/contacts/ContactFormModal';
import { ContactImportDialogV2 } from '@/components/contacts/ContactImportDialogV2';
import ContactRow from '@/components/contacts/ContactRow';

interface ContactsViewProps {
  instanceName?: string;
  onOpenChat?:   (remoteJid: string, contactName: string) => void;
}

const LEAD_STATUS_OPTIONS = [
  { value: 'novo', label: '🆕 Novo' }, { value: 'em_contato', label: '💬 Em contato' },
  { value: 'qualificado', label: '✅ Qualificado' }, { value: 'proposta', label: '📋 Proposta' },
  { value: 'negociacao', label: '🤝 Negociando' }, { value: 'fechado', label: '🏆 Fechado' },
  { value: 'perdido', label: '❌ Perdido' },
];

const SORT_OPTIONS = [
  { value: 'last_message_at:desc', label: 'Último contato ↓' },
  { value: 'last_message_at:asc',  label: 'Último contato ↑' },
  { value: 'full_name:asc',        label: 'Nome A→Z' },
  { value: 'full_name:desc',       label: 'Nome Z→A' },
  { value: 'created_at:desc',      label: 'Criado (recente)' },
  { value: 'lead_score:desc',      label: 'Score ↓' },
];

export const ContactsView: React.FC<ContactsViewProps> = ({ instanceName = 'wpp2', onOpenChat }) => {
  const { contacts, loading, loadingMore, hasMore, total, filters, loadContacts, loadMore, updateFilters, deleteContactsWithUndo } = useContacts();
  const [search, setSearch]           = useState('');
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [createOpen, setCreateOpen]   = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [exportOpen, setExportOpen]   = useState(false);
  const [importOpen, setImportOpen]   = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout>>();
  const loadMoreRef    = useRef<HTMLDivElement>(null);

  useEffect(() => { loadContacts({ instance_name: instanceName }); }, [instanceName, loadContacts]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore(); },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => updateFilters({ search: value }), 400);
  };

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);
  const selectAll = useCallback(() => setSelected(new Set(contacts.map((c) => c.id))), [contacts]);
  const clearSel  = useCallback(() => setSelected(new Set()), []);

  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    deleteContactsWithUndo(ids, `${ids.length} contato${ids.length !== 1 ? 's' : ''}`);
    clearSel();
  };

  return (
    <ContactsErrorBoundary onReset={() => loadContacts()}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b gap-2">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground shrink-0" />
            <h1 className="font-semibold">Contatos</h1>
            {total > 0 && <span className="text-xs text-muted-foreground">{total.toLocaleString('pt-BR')}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setImportOpen(true)} title="Importar contatos" aria-label="Importar contatos">
              <Upload className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="gap-1">
              <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1">
              <UserPlus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Novo</span>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b px-4">
            <TabsList className="h-9 bg-transparent p-0 gap-4">
              <TabsTrigger value="all" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0">
                <Users className="h-3.5 w-3.5 mr-1" />Todos
              </TabsTrigger>
              <TabsTrigger value="duplicates" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0">
                <GitMerge className="h-3.5 w-3.5 mr-1" />Duplicados
              </TabsTrigger>
              <TabsTrigger value="trash" className="h-9 rounded-none border-b-2 border-transparent data-[state=active]:border-primary px-0">
                <Trash2 className="h-3.5 w-3.5 mr-1" />Lixeira
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="flex-1 flex flex-col overflow-hidden mt-0 p-0">
            {/* Search + sort bar */}
            <div className="px-4 py-2 border-b space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Nome, telefone, e-mail..." value={search} onChange={(e) => handleSearch(e.target.value)} className="pl-9 pr-8 h-9" />
                  {search && <button onClick={() => { setSearch(''); updateFilters({ search: '' }); }} className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
                </div>
                <Select value={`${filters.sort_field}:${filters.sort_order}`} onValueChange={(v) => { const [f, o] = v.split(':') as [ContactFilters['sort_field'], ContactFilters['sort_order']]; updateFilters({ sort_field: f, sort_order: o }); }}>
                  <SelectTrigger className="w-40 h-9 shrink-0"><ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" /><SelectValue /></SelectTrigger>
                  <SelectContent>{SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant={filters.lead_status ? 'default' : 'outline'} size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowFilters((v) => !v)} aria-label="Filtros avançados">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </div>
              {showFilters && (
                <div className="flex flex-wrap gap-1.5">
                  {LEAD_STATUS_OPTIONS.map((s) => (
                    <button key={s.value} onClick={() => updateFilters({ lead_status: filters.lead_status === s.value ? null : s.value })}
                      className={`text-xs rounded-full border px-2.5 py-0.5 transition-colors ${filters.lead_status === s.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}>
                      {s.label}
                    </button>
                  ))}
                  {filters.lead_status && <button onClick={() => updateFilters({ lead_status: null })} className="text-xs text-muted-foreground hover:text-foreground underline">Limpar</button>}
                </div>
              )}
            </div>

            {/* Bulk actions */}
            {selected.size > 0 && (
              <div className="px-4 py-2 bg-primary/5 border-b flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{selected.size} selecionado{selected.size !== 1 ? 's' : ''}</Badge>
                <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} className="gap-1"><Download className="h-3.5 w-3.5" />Exportar</Button>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-1"><Trash2 className="h-3.5 w-3.5" />Excluir</Button>
                <Button variant="ghost" size="sm" onClick={clearSel} className="ml-auto">Cancelar</Button>
              </div>
            )}

            {/* Contact list */}
            <div className="flex-1 overflow-y-auto">
              {loading && contacts.length === 0 ? (
                <ContactsPageSkeleton />
              ) : contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Users className="h-12 w-12 mb-3 opacity-20" />
                  <p className="font-medium">Nenhum contato encontrado</p>
                  <p className="text-sm">Tente outro termo ou crie um novo contato.</p>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setImportOpen(true)}><Upload className="h-4 w-4" />Importar CSV</Button>
                    <Button variant="outline" size="sm" className="gap-1" onClick={() => setCreateOpen(true)}><UserPlus className="h-4 w-4" />Criar contato</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-muted/30 border-b text-xs text-muted-foreground">
                    <button onClick={selected.size > 0 ? clearSel : selectAll} className="flex items-center gap-2 hover:text-foreground transition-colors">
                      <CheckSquare className="h-3.5 w-3.5" />{selected.size > 0 ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                    <span className="ml-auto">{total.toLocaleString('pt-BR')} contato{total !== 1 ? 's' : ''}</span>
                  </div>
                  {contacts.map((c) => (
                    <ContactRow key={c.id} contact={c} isSelected={selected.has(c.id)}
                      onSelect={() => toggleSelect(c.id)}
                      onOpenChat={() => onOpenChat?.(c.remote_jid, c.full_name ?? c.push_name ?? c.phone_number ?? '')}
                      onEdit={() => setEditContact(c)}
                      onDelete={() => deleteContactsWithUndo([c.id], c.full_name ?? c.push_name ?? 'Contato')} />
                  ))}
                  <div ref={loadMoreRef} className="h-2" />
                  {loadingMore && <div className="flex justify-center py-3 text-xs text-muted-foreground gap-2"><RefreshCw className="h-3.5 w-3.5 animate-spin" />Carregando...</div>}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="duplicates" className="p-4 overflow-y-auto mt-0">
            <DuplicateContactsPanel workspaceId={instanceName} onMergeComplete={() => loadContacts()} />
          </TabsContent>

          <TabsContent value="trash" className="p-4 overflow-y-auto mt-0">
            <ContactRecycleBin workspaceId={instanceName} onRestored={() => loadContacts()} />
          </TabsContent>
        </Tabs>

        <ContactExportDialog open={exportOpen} onOpenChange={setExportOpen} workspaceId={instanceName}
          activeFilters={{ search: filters.search, tags: filters.tags, channel: filters.lead_status }}
          selectedIds={selected.size > 0 ? Array.from(selected) : undefined} />

        <ContactImportDialogV2 open={importOpen} onOpenChange={setImportOpen} instanceName={instanceName}
          onImported={() => { setImportOpen(false); loadContacts(); }} />

        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto">
            <SheetHeader className="mb-4"><SheetTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Novo Contato</SheetTitle></SheetHeader>
            <ContactFormModal instanceName={instanceName} onSaved={() => { setCreateOpen(false); loadContacts(); }} onCancel={() => setCreateOpen(false)} />
          </SheetContent>
        </Sheet>

        <Sheet open={!!editContact} onOpenChange={(v) => { if (!v) setEditContact(null); }}>
          <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto">
            <SheetHeader className="mb-4"><SheetTitle>Editar Contato</SheetTitle></SheetHeader>
            {editContact && <ContactFormModal instanceName={instanceName} initialData={editContact} isEdit onSaved={() => { setEditContact(null); loadContacts(); }} onCancel={() => setEditContact(null)} />}
          </SheetContent>
        </Sheet>
      </div>
    </ContactsErrorBoundary>
  );
};

export default ContactsView;
