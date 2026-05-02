/**
 * ContactBulkActionsBar.tsx
 * Floating bulk actions bar for selected contacts.
 * Actions: status update, tag add/remove, assign, export, delete.
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
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Download, Trash2, Tag, UserCheck, ChevronDown,
  X, CheckSquare, Loader2, RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/lib/sanitize';

const LEAD_STATUS_OPTIONS = [
  { value: 'novo',        label: '🆕 Novo' },
  { value: 'em_contato',  label: '💬 Em contato' },
  { value: 'qualificado', label: '✅ Qualificado' },
  { value: 'proposta',    label: '📋 Proposta' },
  { value: 'negociacao',  label: '🤝 Negociando' },
  { value: 'fechado',     label: '🏆 Fechado' },
  { value: 'perdido',     label: '❌ Perdido' },
];

interface Props {
  selectedIds:     string[];
  onClearSelection:() => void;
  onDelete:        () => void;
  onExport:        () => void;
  onRefresh?:      () => void;
}

export const ContactBulkActionsBar: React.FC<Props> = ({
  selectedIds, onClearSelection, onDelete, onExport, onRefresh,
}) => {
  const { toast } = useToast();
  const [loading,      setLoading]      = useState<string | null>(null);
  const [tagInput,     setTagInput]     = useState('');
  const [tagPopOpen,   setTagPopOpen]   = useState(false);
  const [tagMode,      setTagMode]      = useState<'add' | 'remove'>('add');

  const count = selectedIds.length;
  if (count === 0) return null;

  const bulkAction = async (action: string, fn: () => Promise<void>) => {
    setLoading(action);
    try {
      await fn();
      onRefresh?.();
    } catch (err) {
      toast({ title: 'Erro na ação em massa', description: String(err), variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const updateStatus = (status: string) => bulkAction('status', async () => {
    const { data, error } = await supabase.rpc('bulk_update_lead_status', {
      p_contact_ids: selectedIds,
      p_lead_status: status,
    });
    if (error) throw error;
    const result = data as Record<string, unknown>;
    if (result?.error) throw new Error(String(result.error));
    toast({ title: '✅ Status atualizado!', description: `${result.updated_count} contatos → ${status}`, duration: 3_000 });
    onClearSelection();
  });

  const handleTag = (mode: 'add' | 'remove') => bulkAction('tag', async () => {
    const tag = sanitizeText(tagInput.trim());
    if (!tag) return;
    const rpc = mode === 'add' ? 'bulk_add_tag' : 'bulk_remove_tag';
    const { data, error } = await supabase.rpc(rpc, { p_contact_ids: selectedIds, p_tag: tag });
    if (error) throw error;
    const result = data as Record<string, unknown>;
    const n = result.tagged_count ?? result.untagged_count ?? 0;
    toast({ title: `✅ Tag ${mode === 'add' ? 'adicionada' : 'removida'}!`, description: `${n} contatos`, duration: 3_000 });
    setTagInput('');
    setTagPopOpen(false);
    onClearSelection();
  });

  return (
    <div className="px-4 py-2 bg-primary/5 border-b flex items-center gap-2 flex-wrap sticky top-0 z-10 backdrop-blur-sm">
      {/* Count badge */}
      <Badge variant="secondary" className="gap-1 shrink-0">
        <CheckSquare className="h-3 w-3" />
        {count} selecionado{count !== 1 ? 's' : ''}
      </Badge>

      {/* Status dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading === 'status'} className="gap-1 h-7">
            {loading === 'status' ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
            Status
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel className="text-xs">Alterar status de {count} contato{count !== 1 ? 's' : ''}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {LEAD_STATUS_OPTIONS.map((s) => (
            <DropdownMenuItem key={s.value} onClick={() => updateStatus(s.value)}>
              {s.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tag actions */}
      <Popover open={tagPopOpen} onOpenChange={setTagPopOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" disabled={loading === 'tag'} className="gap-1 h-7">
            {loading === 'tag' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
            Tags
            <ChevronDown className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-3">
          <p className="text-xs font-medium">Gerenciar tags em {count} contato{count !== 1 ? 's' : ''}</p>
          <div className="flex gap-1">
            <Button size="sm" variant={tagMode === 'add' ? 'default' : 'outline'} className="flex-1 h-7 text-xs" onClick={() => setTagMode('add')}>Adicionar</Button>
            <Button size="sm" variant={tagMode === 'remove' ? 'default' : 'outline'} className="flex-1 h-7 text-xs" onClick={() => setTagMode('remove')}>Remover</Button>
          </div>
          <div className="flex gap-1.5">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleTag(tagMode); }}
              placeholder="Nome da tag..."
              className="flex-1 h-8 text-sm"
            />
            <Button size="sm" className="h-8 px-3" onClick={() => handleTag(tagMode)} disabled={!tagInput.trim()}>
              OK
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Export */}
      <Button variant="outline" size="sm" onClick={onExport} className="gap-1 h-7">
        <Download className="h-3 w-3" />
        <span className="hidden sm:inline">Exportar</span>
      </Button>

      {/* Delete */}
      <Button variant="destructive" size="sm" onClick={onDelete} className="gap-1 h-7">
        <Trash2 className="h-3 w-3" />
        <span className="hidden sm:inline">Excluir</span>
      </Button>

      {/* Clear selection */}
      <Button variant="ghost" size="sm" onClick={onClearSelection} className="ml-auto gap-1 h-7">
        <X className="h-3 w-3" />
        Cancelar
      </Button>
    </div>
  );
};

export default ContactBulkActionsBar;
