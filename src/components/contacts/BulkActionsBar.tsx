/**
 * BulkActionsBar.tsx — v3.0
 * Bulk operations with 5s undo, export, and select-all.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Download, X, CheckSquare } from 'lucide-react';
import { useContactUndo } from './useContactUndo';
import { ContactExportDialog } from './ContactExportDialog';

interface BulkActionsBarProps {
  selectedIds:      string[];
  workspaceId:      string;
  onClearSelection: () => void;
  onSelectAll?:     () => void;
  totalCount?:      number;
  onDeleted?:       (ids: string[]) => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedIds, workspaceId, onClearSelection, onSelectAll, totalCount, onDeleted,
}) => {
  const [exportOpen, setExportOpen] = useState(false);

  const { softDeleteWithUndo } = useContactUndo({
    onCommitted: (ids) => { onDeleted?.(ids); onClearSelection(); },
    onUndone:    ()    => { onDeleted?.([]); },
  });

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b border-primary/10 animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center gap-1.5 shrink-0">
          <CheckSquare className="h-4 w-4 text-primary" />
          <Badge className="text-xs">{selectedIds.length}</Badge>
          <span className="text-sm font-medium text-primary">
            selecionado{selectedIds.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          <Button size="sm" variant="outline" onClick={() => setExportOpen(true)} className="h-7 gap-1 text-xs">
            <Download className="h-3 w-3" />Exportar
          </Button>
          <Button
            size="sm" variant="outline"
            onClick={() => softDeleteWithUndo(selectedIds, `${selectedIds.length} contato${selectedIds.length !== 1 ? 's' : ''}`)}
            className="h-7 gap-1 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
          >
            <Trash2 className="h-3 w-3" />Excluir
          </Button>
        </div>

        {onSelectAll && totalCount && selectedIds.length < totalCount && (
          <button type="button" onClick={onSelectAll} className="text-xs text-primary underline ml-1 hidden sm:inline">
            Selecionar todos ({totalCount.toLocaleString('pt-BR')})
          </button>
        )}

        <button type="button" onClick={onClearSelection} className="text-muted-foreground hover:text-foreground ml-auto" title="Limpar seleção">
          <X className="h-4 w-4" />
        </button>
      </div>

      <ContactExportDialog open={exportOpen} onOpenChange={setExportOpen} workspaceId={workspaceId} selectedIds={selectedIds} />
    </>
  );
};

export default BulkActionsBar;
