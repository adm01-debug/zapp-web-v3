/**
 * ContactsRichView.tsx — ZAPP WEB
 *
 * Tela rica de Contatos: KPIs + Aniversários + Abas por tipo + Toolbar
 * (Filtros, Filtros Salvos, Agrupar) + ContentArea com 6 visualizações
 * (Grid / Lista / Tabela / Pipeline / Mapa / Analytics).
 *
 * Substitui visualmente o `ContactsView.tsx` antigo (Todos/Duplicados/Lixeira)
 * usando exclusivamente componentes que já existem no projeto.
 */
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  UserPlus,
  Upload,
  Trash2,
  GitMerge,
  Keyboard,
  Search,
  Grid,
  List,
  Table,
  Map,
  BarChart3,
  Info,
  X,
  Zap,
  Users,
  Tag as TagIcon,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

import { useContactsViewState } from './useContactsViewState';
import { ContactStatsCards } from './ContactStatsCards';
import { ContactBirthdayPanel } from './ContactBirthdayPanel';
import { ContactToolbar } from './ContactToolbar';
import { ContactContentArea } from './ContactContentArea';
import { ContactDialogs } from './ContactDialogs';
import { ContactImportDialog } from './ContactImportDialog';
import { ContactQuickView } from './ContactQuickView';
import { CONTACT_TYPE_CONFIG } from './contactTypeConfig';
import type { Contact } from './types';

interface ContactsRichViewProps {
  /** Mantido por compatibilidade com a rota; não usado internamente. */
  instanceName?: string;
  onOpenChat?: (remoteJid: string, contactName: string) => void;
}

const TAB_ORDER = [
  'all',
  'cliente',
  'fornecedor',
  'colaborador',
  'prestador_servico',
  'lead',
  'parceiro',
  'sicoob_gifts',
  'transportadora',
  'outros',
  'duplicates',
  'trash',
] as const;

export const ContactsRichView: React.FC<ContactsRichViewProps> = () => {
  const state = useContactsViewState();
  const { crud } = state;

  const {
    contacts,
    totalCount,
    loading,
    contactCountByType,
    uniqueCompanies,
    uniqueJobTitles,
    uniqueTags,
    searchInput,
    handleSearchChange,
    clearSearch,
    activeTab,
    setActiveTab,
    filterCompany,
    setFilterCompany,
    filterJobTitle,
    setFilterJobTitle,
    filterTag,
    setFilterTag,
    filterDateRange,
    setFilterDateRange,
    sortBy,
    setSortBy,
    activeFiltersCount,
    clearFilters,
    showFilters,
    setShowFilters,
    selectedIds,
    openContactChat,
    isAddDialogOpen,
    setIsAddDialogOpen,
    newContact: _newContact,
    handleNewContactChange: _handleNewContactChange,
    handleAddContact: _handleAddContact,
    handleCancelForm: _handleCancelForm,
    isSubmitting: _isSubmitting,
    isEditDialogOpen,
    setIsEditDialogOpen,
    editingContact,
    handleEditContactChange: _handleEditContactChange,
    handleEditContact: _handleEditContact,
    openEditDialog,
    showSuccess,
    setShowSuccess,
    deleteTarget,
    setDeleteTarget,
    handleDeleteContact,
  } = crud;

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);
  // const [highContrast, setHighContrast] = useState(false); // Removed, now in useContactsViewState
  const { highContrast, setHighContrast } = state;
  const [quickViewContact, setQuickViewContact] = useState<Contact | null>(null);

  // Keyboard Shortcuts Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      const key = e.key.toLowerCase();

      // Modal-agnostic shortcuts
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutHelp((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        setShowShortcutHelp(false);
        return;
      }

      // Action shortcuts
      switch (key) {
        case 'n':
          e.preventDefault();
          setIsAddDialogOpen(true);
          toast.info('Atalho: Novo Registro', { duration: 1000 });
          break;
        case 'f': {
          e.preventDefault();
          const searchInput = document.querySelector(
            'input[placeholder*="Buscar"]'
          ) as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            toast.info('Atalho: Focar Busca', { duration: 1000 });
          }
          break;
        }
        case 'g':
          e.preventDefault();
          state.setViewMode('grid');
          toast.info('Visualização: Grid', { duration: 1000 });
          break;
        case 'l':
          e.preventDefault();
          state.setViewMode('list');
          toast.info('Visualização: Lista', { duration: 1000 });
          break;
        case 't':
          e.preventDefault();
          state.setViewMode('table');
          toast.info('Visualização: Tabela', { duration: 1000 });
          break;
        case 'm':
          e.preventDefault();
          state.setViewMode('map');
          toast.info('Visualização: Mapa', { duration: 1000 });
          break;
        case 'a':
          e.preventDefault();
          state.setViewMode('analytics');
          toast.info('Visualização: Analytics', { duration: 1000 });
          break;
        case 'p':
          e.preventDefault();
          state.setViewMode('kanban');
          toast.info('Visualização: Pipeline (Kanban)', { duration: 1000 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsAddDialogOpen, state]);

  // Stub de CRM batch
  const getCRMData = (_phone: string) => null;

  const contactsForContent: Contact[] = useMemo(() => (contacts as Contact[]) ?? [], [contacts]);

  const handleContactClick = useCallback(
    (contactId: string) => {
      const contact = contactsForContent.find((c) => c.id === contactId);
      if (contact) {
        setQuickViewContact(contact);
      }
    },
    [contactsForContent]
  );

  const contactsForBirthday = useMemo(
    () =>
      contactsForContent.map((c) => ({
        id: c.id,
        name: c.name,
        avatar_url: c.avatar_url,
        // birthday não vem nesse hook — painel mostra empty state graciosamente
        birthday: null as string | null,
      })),
    [contactsForContent]
  );

  const tabs = useMemo(() => {
    return TAB_ORDER.filter((key) => {
      if (key === 'all') return true;
      // só mostra abas com count > 0 ou com configuração conhecida
      return CONTACT_TYPE_CONFIG[key];
    });
  }, []);

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-y-auto bg-background transition-all duration-300',
        highContrast && 'high-contrast-mode'
      )}
    >
      <div className="mx-auto w-full max-w-[1600px] space-y-4 px-4 py-4 lg:px-6">
        {/* ── KPIs + Aniversários ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
          <ContactStatsCards
            totalCount={totalCount}
            contactCountByType={contactCountByType}
            uniqueCompanies={uniqueCompanies}
            contacts={contactsForContent.map((c) => ({
              created_at: c.created_at,
            }))}
          />
          <ContactBirthdayPanel contacts={contactsForBirthday} onContactClick={openContactChat} />
        </div>

        {/* ── Header + ação rápida ────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
              Hub de Contatos
            </h1>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                <Users className="h-4 w-4 text-primary/60" />
                {totalCount.toLocaleString('pt-BR')} registros
              </span>
              <span className="h-1 w-1 rounded-full bg-border" />
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                Hana Smart View
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={highContrast ? 'default' : 'outline'}
              size="sm"
              onClick={() => setHighContrast(!highContrast)}
              className={cn(
                'hidden gap-2 transition-all md:flex',
                !highContrast
                  ? 'border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5'
                  : 'bg-foreground text-background hover:bg-foreground/90'
              )}
              title="Alto Contraste"
            >
              <Zap
                className={cn('h-4 w-4', highContrast ? 'text-warning' : 'text-muted-foreground')}
              />
              <span className="sr-only">Contraste</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShortcutHelp(true)}
              className="hidden gap-2 border-muted-foreground/20 transition-all hover:border-primary/40 hover:bg-primary/5 md:flex"
              title="Atalhos de Teclado (?)"
            >
              <Keyboard className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Atalhos</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(true)}
              className="gap-2 border-primary/20 transition-all hover:border-primary/40 hover:bg-primary/5"
            >
              <Upload className="h-4 w-4 text-primary" />
              <span className="hidden font-medium sm:inline">Importar CSV</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="gap-2 font-medium shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30"
            >
              <UserPlus className="h-4 w-4" />
              Novo Registro
            </Button>
          </div>
        </div>

        {/* ── Abas por tipo ───────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
            <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-background">
              Todos
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                {(contactCountByType.all ?? totalCount).toLocaleString('pt-BR')}
              </Badge>
            </TabsTrigger>
            {tabs
              .filter((k) => k !== 'all' && k !== 'duplicates' && k !== 'trash')
              .map((key) => {
                const cfg = CONTACT_TYPE_CONFIG[key];
                const count = contactCountByType[key] ?? 0;
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="gap-2 data-[state=active]:bg-background"
                  >
                    <span className="flex items-center gap-1.5">
                      {cfg?.iconNode}
                      {cfg?.label || key}
                    </span>
                    {count > 0 && (
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                        {count.toLocaleString('pt-BR')}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            <div className="mx-1 my-auto hidden h-6 w-px bg-border sm:block" />
            <TabsTrigger
              value="duplicates"
              className="gap-2 text-warning-foreground transition-colors hover:text-warning-foreground data-[state=active]:bg-background"
            >
              <GitMerge className="h-3.5 w-3.5" />
              Duplicados
            </TabsTrigger>
            <TabsTrigger
              value="trash"
              className="gap-2 text-destructive transition-colors hover:text-destructive/80 data-[state=active]:bg-background"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Lixeira
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ── Toolbar (busca, ordenação, filtros, view switcher) ──────── */}
        <ContactToolbar
          searchInput={searchInput}
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
          setSortBy={setSortBy}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          activeFiltersCount={activeFiltersCount}
          clearFilters={clearFilters}
          activeTab={activeTab}
          filterCompany={filterCompany}
          setFilterCompany={setFilterCompany}
          filterJobTitle={filterJobTitle}
          setFilterJobTitle={setFilterJobTitle}
          filterTag={filterTag}
          setFilterTag={setFilterTag}
          filterDateRange={filterDateRange}
          setFilterDateRange={setFilterDateRange}
          uniqueCompanies={uniqueCompanies as string[]}
          uniqueJobTitles={uniqueJobTitles as string[]}
          uniqueTags={uniqueTags as string[]}
          onApplyPreset={state.handleApplyPreset}
          groupByCompany={state.groupByCompany}
          setGroupByCompany={state.setGroupByCompany}
          selectedIds={selectedIds}
          onBulkTag={() => state.setIsBulkTagOpen(true)}
          onCompare={() => state.setIsCompareOpen(true)}
          onMerge={() => state.setIsMergeOpen(true)}
          viewMode={state.viewMode}
          setViewMode={state.setViewMode}
          gridColumns={state.gridColumns}
          setGridColumns={state.setGridColumns}
          totalCount={totalCount}
        />

        {/* ── Conteúdo (Grid / Lista / Tabela / Pipeline / Mapa / Analytics) ── */}
        <LayoutGroup>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="relative"
          >
            <ContactContentArea
              loading={loading}
              contacts={contactsForContent}
              viewMode={state.viewMode}
              activeTab={activeTab}
              gridColumns={state.gridColumns}
              groupByCompany={state.groupByCompany}
              selectedIds={selectedIds}
              search={searchInput}
              activeFiltersCount={activeFiltersCount}
              onToggleSelect={state.handleToggleSelect}
              onContactClick={handleContactClick}
              onEdit={(c) => openEditDialog(c as never)}
              onDelete={(c) => setDeleteTarget(c as never)}
              onSelectIds={crud.setSelectedIds}
              onAddContact={() => setIsAddDialogOpen(true)}
              onClearSearch={clearSearch}
              onClearFilters={clearFilters}
              onImport={() => setIsImportOpen(true)}
              getCRMData={getCRMData}
              workspaceId="wpp2"
              onRefresh={() => crud.refetch()}
            />

            {/* ── Floating Batch Action Bar ──────────────────────────── */}
            <AnimatePresence>
              {selectedIds.length > 0 && (
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 100, opacity: 0 }}
                  className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-background/10 bg-foreground px-4 py-3 text-background shadow-2xl backdrop-blur-xl"
                >
                  <div className="flex items-center gap-2 border-r border-background/20 pr-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {selectedIds.length}
                    </div>
                    <span className="whitespace-nowrap text-sm font-semibold">Selecionados</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-2 px-3 text-background hover:bg-background/10"
                      onClick={() => state.setIsBulkTagOpen(true)}
                    >
                      <TagIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Etiquetar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-2 px-3 text-background hover:bg-background/10"
                      onClick={() => state.setIsMergeOpen(true)}
                    >
                      <GitMerge className="h-4 w-4" />
                      <span className="hidden sm:inline">Mesclar</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-2 px-3 text-background hover:bg-background/10"
                      onClick={() => state.handleExportCSV()}
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Exportar</span>
                    </Button>
                    <div className="mx-1 h-6 w-px bg-background/20" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 gap-2 px-3 text-destructive-foreground hover:bg-destructive/20"
                      onClick={() => {
                        const count = selectedIds.length;
                        toast.error(`Excluir ${count} contatos?`, {
                          action: {
                            label: 'Confirmar',
                            onClick: () => {
                              selectedIds.forEach((id) => handleDeleteContact(id));
                              crud.setSelectedIds([]);
                            },
                          },
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Excluir</span>
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-background hover:bg-background/10"
                    onClick={() => crud.setSelectedIds([])}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      </div>

      {/* ── Quick View lateral ─────────────────────────────────────── */}
      <ContactQuickView
        contact={quickViewContact}
        isOpen={!!quickViewContact}
        onClose={() => setQuickViewContact(null)}
        onEdit={(c) => {
          setQuickViewContact(null);
          openEditDialog(c as never);
        }}
        onDelete={(c) => {
          setQuickViewContact(null);
          setDeleteTarget(c as never);
        }}
        onOpenChat={(_phone, _name) => {
          setQuickViewContact(null);
          openContactChat(quickViewContact?.id || '');
        }}
      />

      {/* ── Dialogs (Adicionar, Editar, Sucesso, Excluir) ─────────────── */}
      {/* ── Shortcut Help Overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {showShortcutHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md"
            onClick={() => setShowShortcutHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Keyboard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Atalhos de Teclado</h2>
                  <p className="text-sm text-muted-foreground">Aumente sua produtividade</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={() => setShowShortcutHelp(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Ações
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <UserPlus className="h-3.5 w-3.5" /> Novo Registro
                      </span>
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                        N
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Search className="h-3.5 w-3.5" /> Buscar
                      </span>
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                        F
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Info className="h-3.5 w-3.5" /> Ajuda
                      </span>
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                        ?
                      </kbd>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      Visualizações
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Grid className="h-3.5 w-3.5" /> Grid
                      </span>
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                        G
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <List className="h-3.5 w-3.5" /> Lista
                      </span>
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                        L
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Table className="h-3.5 w-3.5" /> Tabela
                      </span>
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                        T
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <Map className="h-3.5 w-3.5" /> Mapa
                      </span>
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                        M
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-3.5 w-3.5" /> Analytics
                      </span>
                      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px]">
                        A
                      </kbd>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 text-center">
                  <p className="text-xs italic text-muted-foreground">
                    Pressione <kbd className="rounded bg-muted px-1 py-0.5 text-[9px]">Esc</kbd>{' '}
                    para fechar
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ContactDialogs
        workspaceId="wpp2"
        isAddDialogOpen={isAddDialogOpen}
        setIsAddDialogOpen={setIsAddDialogOpen}
        onContactSaved={() => crud.refetch()}
        isEditDialogOpen={isEditDialogOpen}
        setIsEditDialogOpen={setIsEditDialogOpen}
        editingContact={editingContact}
        showSuccess={showSuccess}
        setShowSuccess={setShowSuccess}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        handleDeleteContact={handleDeleteContact}
      />

      <ContactImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        workspaceId="wpp2"
        onImportComplete={() => crud.refetch()}
      />

      <ContactQuickView
        contact={quickViewContact}
        isOpen={!!quickViewContact}
        onClose={() => setQuickViewContact(null)}
        onEdit={(c) => {
          setQuickViewContact(null);
          openEditDialog(c as never);
        }}
        onDelete={(c) => {
          setQuickViewContact(null);
          setDeleteTarget(c as never);
        }}
        onOpenChat={(phone, _name) => {
          setQuickViewContact(null);
          openContactChat(phone);
        }}
      />
    </div>
  );
};

export default ContactsRichView;
