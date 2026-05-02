/**
 * ConflictResolutionDialog.tsx
 * Shown when update_contact_versioned() returns a CONFLICT error.
 * Lets the user choose between their changes or the server's current state.
 */
import React from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { sanitizeText } from '@/lib/sanitize';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ConflictInfo {
  message:         string;
  current_version: number;
  your_version:    number;
  last_updated_by: string | null;
  last_updated_at: string | null;
}

interface ConflictResolutionDialogProps {
  open:        boolean;
  conflict:    ConflictInfo;
  onKeepMine:  () => void;   // Force-save user's changes (overwrite)
  onTakeTheirs:() => void;   // Discard user's changes, reload server version
  onCancel:    () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export const ConflictResolutionDialog: React.FC<ConflictResolutionDialogProps> = ({
  open, conflict, onKeepMine, onTakeTheirs, onCancel,
}) => {
  const updatedAt = conflict.last_updated_at
    ? new Date(conflict.last_updated_at).toLocaleString('pt-BR')
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            Conflito de edição
          </DialogTitle>
          <DialogDescription>
            Este contato foi modificado por outro usuário enquanto você editava.
            Escolha qual versão manter.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2 text-sm">
          {conflict.last_updated_by && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-amber-800">Editado por:</span>
              <Badge variant="outline" className="text-amber-700 border-amber-400">
                {sanitizeText(conflict.last_updated_by)}
              </Badge>
            </div>
          )}
          {updatedAt && (
            <div className="text-amber-700 text-xs">
              <span className="font-medium">Em:</span> {updatedAt}
            </div>
          )}
          <div className="text-xs text-amber-700 flex gap-3">
            <span>Versão salva: <Badge variant="outline" className="border-amber-400">{conflict.current_version}</Badge></span>
            <span>Sua versão: <Badge variant="outline" className="border-amber-400">{conflict.your_version}</Badge></span>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:flex-col">
          <Button variant="outline" onClick={onCancel} className="gap-1 flex-1">
            Cancelar
          </Button>
          <Button
            variant="outline"
            onClick={onTakeTheirs}
            className="gap-1 flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <RefreshCw className="h-4 w-4" />
            Usar versão mais recente
          </Button>
          <Button
            variant="destructive"
            onClick={onKeepMine}
            className="gap-1 flex-1"
          >
            <Save className="h-4 w-4" />
            Sobrescrever com os meus dados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ConflictResolutionDialog;
