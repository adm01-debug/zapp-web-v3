import { useState, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { Bold, Italic, Underline, Link2, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useEmailSignature, type EmailSignature } from '@/hooks/useEmailSignature';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Trash2, Star, Pencil } from 'lucide-react';

interface EmailSignatureEditorProps {
  accountId: string | null;
}

export function EmailSignatureEditor({ accountId }: EmailSignatureEditorProps) {
  const {
    signatures,
    defaultSignature: _defaultSignature,
    isLoading,
    save,
    remove,
    setDefault,
  } = useEmailSignature(accountId);
  const [editing, setEditing] = useState<Partial<EmailSignature> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  const openNew = () =>
    setEditing({ name: 'Nova Assinatura', html_content: '', is_default: false });
  const openEdit = (sig: EmailSignature) => setEditing({ ...sig });
  const closeEditor = () => setEditing(null);

  const execCmd = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }, []);

  const handleSave = async () => {
    if (!editing) return;
    const content = editorRef.current?.innerHTML ?? '';
    if (!editing.name?.trim()) {
      toast.error('Nome da assinatura é obrigatório');
      return;
    }

    await save({
      id: editing.id,
      name: editing.name,
      html_content: content,
      is_default: editing.is_default ?? false,
    });
    closeEditor();
  };

  if (!accountId) {
    return (
      <p className="text-sm text-muted-foreground">
        Conecte uma conta Email para gerenciar assinaturas.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Lista de assinaturas */}
      <div className="space-y-2">
        {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}

        {signatures.length === 0 && !isLoading && (
          <p className="text-sm italic text-muted-foreground">Nenhuma assinatura configurada.</p>
        )}

        {signatures.map((sig) => (
          <div
            key={sig.id}
            className={cn(
              'space-y-2 rounded-lg border p-3 transition-colors',
              sig.is_default && 'border-primary/40 bg-primary/5'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {sig.is_default && (
                  <Star className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" />
                )}
                <span className="truncate text-sm font-medium">{sig.name}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!sig.is_default && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDefault(sig.id)}
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEdit(sig)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => setConfirmDelete(sig.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div
              className="max-h-16 overflow-hidden border-t pt-2 text-xs text-muted-foreground"
              dangerouslySetInnerHTML={{
                __html: DOMPurify.sanitize(sig.html_content || '<em>Sem conteúdo</em>'),
              }}
            />
          </div>
        ))}
      </div>

      <Button variant="outline" size="sm" className="w-full gap-2" onClick={openNew}>
        <Plus className="h-4 w-4" />
        Nova Assinatura
      </Button>

      {/* Editor Dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Editar' : 'Nova'} Assinatura</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input
                  value={editing?.name ?? ''}
                  onChange={(e) =>
                    setEditing((prev) => (prev ? { ...prev, name: e.target.value } : null))
                  }
                  placeholder="Ex: Padrão, Formal..."
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={editing?.is_default ?? false}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, is_default: e.target.checked } : null
                      )
                    }
                    className="rounded"
                  />
                  Assinatura padrão
                </label>
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border bg-muted/50 px-2 py-1.5">
              {(
                [
                  { icon: Bold, cmd: 'bold', tip: 'Negrito' },
                  { icon: Italic, cmd: 'italic', tip: 'Itálico' },
                  { icon: Underline, cmd: 'underline', tip: 'Sublinhado' },
                ] as const
              ).map(({ icon: Icon, cmd, tip }) => (
                <Tooltip key={cmd}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        execCmd(cmd);
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{tip}</TooltipContent>
                </Tooltip>
              ))}
              <Separator orientation="vertical" className="mx-1 h-5" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const url = prompt('URL:');
                      if (url) execCmd('createLink', url);
                    }}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Link</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      execCmd('insertHorizontalRule');
                    }}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Linha separadora</TooltipContent>
              </Tooltip>
            </div>

            {/* Editor contentEditable */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="max-h-64 min-h-32 overflow-auto rounded-b-md border border-t-0 p-3 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editing?.html_content ?? '') }}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeEditor}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Assinatura</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir assinatura?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDelete) {
                  remove(confirmDelete);
                  setConfirmDelete(null);
                }
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
