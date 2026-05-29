/**
 * ContactQuickNotePanel.tsx
 * Inline quick note component for the chat sidebar.
 * Solves Gap #15: No inline note-taking during conversations.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StickyNote, Send, Trash2, Loader2 } from 'lucide-react';
import { useContactQuickNote } from '@/hooks/useContactQuickNote';
import { sanitizeText } from '@/lib/sanitize';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ContactQuickNotePanelProps {
  contactId: string;
  workspaceId: string;
  readonly?: boolean;
  maxVisible?: number;
}

export const ContactQuickNotePanel: React.FC<ContactQuickNotePanelProps> = ({
  contactId, workspaceId, readonly = false, maxVisible = 5,
}) => {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { notes, isLoading, isSaving, loadNotes, addNote, deleteNote } = useContactQuickNote(
    contactId, workspaceId
  );

  useEffect(() => { loadNotes(); }, [loadNotes]);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await addNote(text);
    setText('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const visibleNotes = expanded ? notes : notes.slice(0, maxVisible);

  return (
    <div className="space-y-2" role="region" aria-label="Notas rápidas do contato">
      <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
        <StickyNote className="h-3 w-3" /> Notas Rápidas
        {notes.length > 0 && (
          <Badge variant="secondary" className="text-[10px] ml-1 px-1">{notes.length}</Badge>
        )}
      </p>

      {!readonly && (
        <div className="flex gap-1.5">
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Adicionar nota rápida... (Ctrl+Enter)"
            className="text-xs min-h-[36px] max-h-[80px] resize-none"
            rows={1}
            aria-label="Nova nota rápida"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleSubmit}
            disabled={!text.trim() || isSaving}
            className="shrink-0 h-9 w-9"
            aria-label="Enviar nota"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : visibleNotes.length > 0 ? (
        <div className="space-y-1.5">
          {visibleNotes.map((note) => (
            <div key={note.id} className="group bg-muted/30 rounded p-2 text-xs relative">
              <p className="whitespace-pre-wrap break-words pr-6">{sanitizeText(note.content)}</p>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                <span className="font-medium">{sanitizeText(note.author_name || 'Agente')}</span>
                <span>&middot;</span>
                <span>{formatDistanceToNow(new Date(note.created_at), { addSuffix: true, locale: ptBR })}</span>
              </div>
              {!readonly && (
                <button
                  onClick={() => deleteNote(note.id)}
                  className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  aria-label={`Remover nota`}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
          {notes.length > maxVisible && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-primary hover:underline w-full text-center py-0.5"
            >
              {expanded ? 'Mostrar menos' : `Ver mais ${notes.length - maxVisible} notas`}
            </button>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Nenhuma nota ainda.</p>
      )}
    </div>
  );
};

export default ContactQuickNotePanel;
