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
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UserPlus, Upload, Trash2, GitMerge } from 'lucide-react';

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

  // Stub de CRM batch — a versão rica original consulta empresa/logo por
  // telefone; aqui devolvemos null para manter UI estável sem custo extra.
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
            <h1 className="text-xl font-semibold tracking-tight">Contatos</h1>
            <p className="text-xs text-muted-foreground">
              {totalCount.toLocaleString('pt-BR')} contato{totalCount !== 1 ? 's' : ''} no total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportOpen(true)}
              className="gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Importar CSV</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setIsAddDialogOpen(true)}
              className="gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Novo Contato
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
            <TabsTrigger value="duplicates" className="gap-2 data-[state=active]:bg-background text-orange-500">
              <GitMerge className="w-3.5 h-3.5" />
              Duplicados
            </TabsTrigger>
            <TabsTrigger value="trash" className="gap-2 data-[state=active]:bg-background text-destructive">
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
