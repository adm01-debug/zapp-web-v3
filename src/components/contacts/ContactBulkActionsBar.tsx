/**
 * ContactBulkActionsBar.tsx — v2.0
 * Slide-up bulk actions toolbar shown when contacts are selected.
 * Uses RPCs: bulk_update_lead_status, bulk_add_tag, bulk_assign_contacts, bulk_soft_delete_contacts
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  X, Download, Trash2, Tag, UserCheck, TrendingUp,
  RefreshCw, CheckSquare, ChevronDown,
} from 'lucide-react';
import { dbRpc } from '@/integrations/datasource/db';
import { RPC } from '@/integrations/datasource/rpcCatalog';
import { useToast } from '@/hooks/use-toast';

interface Props {
  selectedIds:    string[];
  onClearSelection: () => void;
  onDelete?:      () => void;
  onExport?:      () => void;
  onRefresh?:     () => void;
}

const LEAD_STATUSES = [
  { value: 'novo',         label: '🆕 Novo' },
  { value: 'em_contato',   label: '💬 Em contato' },
  { value: 'qualificado',  label: '✅ Qualificado' },
  { value: 'proposta',     label: '📋 Proposta' },
  { value: 'negociacao',   label: '🤝 Negociando' },
  { value: 'fechado',      label: '🏆 Fechado' },
  { value: 'perdido',      label: '❌ Perdido' },
];

export const ContactBulkActionsBar: React.FC<Props> = ({
  selectedIds, onClearSelection, onDelete, onExport, onRefresh,
}) => {
  const { toast }      = useToast();
  const [tagInput, setTagInput]   = useState('');
  const [loading,  setLoading]    = useState<string | null>(null);
  const count = selectedIds.length;

  if (count === 0) return null;

  const withLoading = async (key: string, fn: () => Promise<void>) => {
    setLoading(key);
    try { await fn(); }
    catch (err) { toast({ title: 'Erro', description: String(err), variant: 'destructive' }); }
    finally { setLoading(null); }
  };

  const updateLeadStatus = (status: string) =>
    withLoading('status', async () => {
      const { error } = await dbRpc(RPC.bulkUpdateLeadStatus, {
        p_contact_ids: selectedIds, p_status: status,
      });
      if (error) throw error;
      toast({ title: `✅ Status atualizado!`, description: `${count} contato${count !== 1 ? 's' : ''} → ${status}`, duration: 3_000 });
      onRefresh?.();
      onClearSelection();
    });

  const addTag = () => {
    const tag = tagInput.trim();
    if (!tag) return;
    withLoading('tag', async () => {
      const { error } = await dbRpc(RPC.bulkAddTag, {
        p_contact_ids: selectedIds, p_tag: tag,
      });
      if (error) throw error;
      toast({ title: `🏷️ Tag adicionada!`, description: `"${tag}" em ${count} contato${count !== 1 ? 's' : ''}`, duration: 3_000 });
      setTagInput('');
      onRefresh?.();
    });
  };

  const handleDelete = () => {
    if (!confirm(`Excluir ${count} contato${count !== 1 ? 's' : ''}? Esta ação pode ser desfeita na Lixeira.`)) return;
    onDelete?.();
  };

  return (
    <div
      role="toolbar"
      aria-label="Ações em massa"
      className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-primary/20 flex-wrap"
    >
      {/* Selection count */}
      <div className="flex items-center gap-1.5">
        <CheckSquare className="h-4 w-4 text-primary" aria-hidden="true" />
        <Badge className="bg-primary text-primary-foreground text-xs px-2 tabular-nums">
          {count} selecionado{count !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Lead status dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1 h-7" disabled={loading === 'status'}>
            {loading === 'status'
              ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              : <TrendingUp className="h-3.5 w-3.5" />}
            Status
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel className="text-xs">Alterar lead status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {LEAD_STATUSES.map((s) => (
            <DropdownMenuItem key={s.value} onClick={() => updateLeadStatus(s.value)} className="text-xs">
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tag input */}
      <div className="flex items-center gap-1">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
        <Input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTag(); }}
          placeholder="Tag..."
          className="h-7 w-24 text-xs px-2"
          aria-label="Nome da tag"
          disabled={loading === 'tag'}
        />
        <Button
          variant="outline" size="sm" onClick={addTag}
          disabled={!tagInput.trim() || loading === 'tag'}
          className="h-7 text-xs px-2"
        >
          {loading === 'tag' ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Adicionar'}
        </Button>
      </div>

      {/* Export */}
      {onExport && (
        <Button variant="outline" size="sm" onClick={onExport} className="gap-1 h-7" aria-label="Exportar selecionados">
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      )}

      {/* Delete */}
      {onDelete && (
        <Button variant="outline" size="sm" onClick={handleDelete} className="gap-1 h-7 text-destructive border-destructive/30 hover:bg-destructive/5" aria-label="Excluir selecionados">
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Excluir</span>
        </Button>
      )}

      {/* Spacer + Clear */}
      <div className="flex-1" />
      <Button variant="ghost" size="sm" onClick={onClearSelection} className="gap-1 h-7" aria-label="Limpar seleção">
        <X className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Limpar</span>
      </Button>
    </div>
  );
};

export default ContactBulkActionsBar;
