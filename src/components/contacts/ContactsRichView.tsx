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
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  UserPlus, Upload, Trash2, GitMerge, Keyboard, 
  Search, Grid, List, Table, Map, BarChart3, Info
} from 'lucide-react';
import { toast } from 'sonner';

import { useContactsViewState } from './useContactsViewState';
import { ContactStatsCards } from './ContactStatsCards';
import { ContactBirthdayPanel } from './ContactBirthdayPanel';
import { ContactToolbar } from './ContactToolbar';
import { ContactContentArea } from './ContactContentArea';
import { ContactDialogs } from './ContactDialogs';
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
    contacts, totalCount, loading,
    contactCountByType, uniqueCompanies, uniqueJobTitles, uniqueTags,
    searchInput, handleSearchChange, clearSearch,
    activeTab, setActiveTab,
    filterCompany, setFilterCompany,
    filterJobTitle, setFilterJobTitle,
    filterTag, setFilterTag,
    filterDateRange, setFilterDateRange,
    sortBy, setSortBy,
    activeFiltersCount, clearFilters,
    showFilters, setShowFilters,
    selectedIds, openContactChat,
    isAddDialogOpen, setIsAddDialogOpen, newContact,
    handleNewContactChange, handleAddContact, handleCancelForm, isSubmitting,
    isEditDialogOpen, setIsEditDialogOpen, editingContact,
    handleEditContactChange, handleEditContact, openEditDialog,
    showSuccess, setShowSuccess,
    deleteTarget, setDeleteTarget, handleDeleteContact,
  } = crud;

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

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
        setShowShortcutHelp(prev => !prev);
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
          toast.info("Atalho: Novo Registro", { duration: 1000 });
          break;
        case 'f':
          e.preventDefault();
          const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            toast.info("Atalho: Focar Busca", { duration: 1000 });
          }
          break;
        case 'g':
          e.preventDefault();
          state.setViewMode('grid');
          toast.info("Visualização: Grid", { duration: 1000 });
          break;
        case 'l':
          e.preventDefault();
          state.setViewMode('list');
          toast.info("Visualização: Lista", { duration: 1000 });
          break;
        case 't':
          e.preventDefault();
          state.setViewMode('table');
          toast.info("Visualização: Tabela", { duration: 1000 });
          break;
        case 'm':
          e.preventDefault();
          state.setViewMode('map');
          toast.info("Visualização: Mapa", { duration: 1000 });
          break;
        case 'a':
          e.preventDefault();
          state.setViewMode('analytics');
          toast.info("Visualização: Analytics", { duration: 1000 });
          break;
        case 'p':
          e.preventDefault();
          state.setViewMode('kanban');
          toast.info("Visualização: Pipeline (Kanban)", { duration: 1000 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsAddDialogOpen, state]);

  // Stub de CRM batch
  const getCRMData = (_phone: string) => null;

  const contactsForContent: Contact[] = useMemo(
    () => (contacts as Contact[]) ?? [],
    [contacts],
  );

  const contactsForBirthday = useMemo(
    () => contactsForContent.map((c) => ({
      id: c.id,
      name: c.name,
      avatar_url: c.avatar_url,
      // birthday não vem nesse hook — painel mostra empty state graciosamente
      birthday: null as string | null,
    })),
    [contactsForContent],
  );

  const tabs = useMemo(() => {
    return TAB_ORDER.filter((key) => {
      if (key === 'all') return true;
      // só mostra abas com count > 0 ou com configuração conhecida
      return CONTACT_TYPE_CONFIG[key];
    });
  }, []);

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-background">
      <div className="px-4 py-4 lg:px-6 space-y-4 max-w-[1600px] w-full mx-auto">
        {/* ── KPIs + Aniversários ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <ContactStatsCards
            totalCount={totalCount}
            contactCountByType={contactCountByType}
            uniqueCompanies={uniqueCompanies}
            contacts={contactsForContent.map((c) => ({
              created_at: c.created_at,
            }))}
          />
          <ContactBirthdayPanel
            contacts={contactsForBirthday}
            onContactClick={openContactChat}
          />
        </div>

        {/* ── Header + ação rápida ────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Hub de Contatos
            </h1>
            <p className="text-sm text-muted-foreground flex items-center gap-2 mt-0.5">
              <span>{totalCount.toLocaleString('pt-BR')} registros</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-primary/80 font-medium">Hana Smart View</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShortcutHelp(true)}
              className="hidden md:flex gap-2 border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
              title="Atalhos de Teclado (?)"
            >
              <Keyboard className="w-4 h-4 text-muted-foreground" />
              <span className="sr-only">Atalhos</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(true)}
              className="gap-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
            >
              <Upload className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline font-medium">Importar CSV</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Novo Registro
            </Button>
          </div>
        </div>

        {/* ── Abas por tipo ───────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
            <TabsTrigger value="all" className="gap-2 data-[state=active]:bg-background">
              Todos
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
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
                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                        {count.toLocaleString('pt-BR')}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            <div className="w-px h-6 bg-border mx-1 my-auto hidden sm:block" />
            <TabsTrigger value="duplicates" className="gap-2 data-[state=active]:bg-background text-orange-500 hover:text-orange-600 transition-colors">
              <GitMerge className="w-3.5 h-3.5" />
              Duplicados
            </TabsTrigger>
            <TabsTrigger value="trash" className="gap-2 data-[state=active]:bg-background text-destructive hover:text-destructive/80 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
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
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
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
            onContactClick={openContactChat}
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
        </motion.div>
      </div>

      {/* ── Dialogs (Adicionar, Editar, Sucesso, Excluir) ─────────────── */}
      {/* ── Shortcut Help Overlay ───────────────────────────────────── */}
      <AnimatePresence>
        {showShortcutHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md"
            onClick={() => setShowShortcutHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-card border border-border shadow-2xl rounded-2xl p-6 max-w-md w-full relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Keyboard className="w-5 h-5 text-primary" />
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
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Ações</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><UserPlus className="w-3.5 h-3.5" /> Novo Registro</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">N</kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><Search className="w-3.5 h-3.5" /> Buscar</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">F</kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><Info className="w-3.5 h-3.5" /> Ajuda</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">?</kbd>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Visualizações</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><Grid className="w-3.5 h-3.5" /> Grid</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">G</kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><List className="w-3.5 h-3.5" /> Lista</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">L</kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><Table className="w-3.5 h-3.5" /> Tabela</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">T</kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><Map className="w-3.5 h-3.5" /> Mapa</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">M</kbd>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> Analytics</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">A</kbd>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-border/50 text-center">
                  <p className="text-xs text-muted-foreground italic">Pressione <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Esc</kbd> para fechar</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ContactDialogs
        isAddDialogOpen={isAddDialogOpen}
        setIsAddDialogOpen={setIsAddDialogOpen}
        newContact={newContact}
        handleNewContactChange={handleNewContactChange}
        handleAddContact={handleAddContact}
        handleCancelForm={handleCancelForm}
        isSubmitting={isSubmitting}
        isEditDialogOpen={isEditDialogOpen}
        setIsEditDialogOpen={setIsEditDialogOpen}
        editingContact={editingContact}
        handleEditContactChange={handleEditContactChange}
        handleEditContact={handleEditContact}
        showSuccess={showSuccess}
        setShowSuccess={setShowSuccess}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        handleDeleteContact={handleDeleteContact}
      />
    </div>
  );
};

export default ContactsRichView;
