import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { StickyNote, Plus, Send, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getAvatarColor, getInitials } from '@/lib/avatar-colors';

interface Note {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author_name?: string;
}

interface ContactNotesProps {
  contactId: string;
  className?: string;
}

export function ContactNotes({ contactId, className }: ContactNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [adding, setAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const fetchNotes = useCallback(async () => {
    const { data, error: _error } = await (supabase.from('contact_notes') as any)
      .select('id, content, created_at, author_id')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      // Fetch author names
      const authorIds = [...new Set(data.map((n) => n.author_id))];
      const { data: profiles, error: _profilesErr } = await (supabase.from('profiles') as any)
        .select('id, name')
        .in('id', authorIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.name]) || []);

      setNotes(
        data.map((n) => ({
          ...n,
          author_name: profileMap.get(n.author_id) || 'Agente',
        }))
      );
    }
    setLoading(false);
  }, [contactId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleAdd = async () => {
    if (!newNote.trim()) return;
    setAdding(true);
    try {
      const { data: profile, error: _profileErr } = await (supabase.from('profiles') as any)
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
        .single();

      if (!profile) throw new Error('Perfil não encontrado');

      const { error } = await (supabase.from('contact_notes') as any).insert({
        contact_id: contactId,
        author_id: profile.id,
        content: newNote.trim(),
      });

      if (error) throw error;
      setNewNote('');
      setShowInput(false);
      toast.success('Nota adicionada');
      fetchNotes();
    } catch {
      toast.error('Erro ao adicionar nota');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    const { error } = await (supabase.from('contact_notes') as any).delete().eq('id', noteId);

    if (error) {
      toast.error('Erro ao excluir nota');
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    toast.success('Nota excluída');
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <StickyNote className="h-3 w-3" />
          Notas
        </h3>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {notes.length}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setShowInput(!showInput)}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Add note input */}
      <AnimatePresence>
        {showInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Escreva uma nota..."
                className="min-h-[60px] resize-none text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd();
                }}
              />
              <div className="flex justify-end gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowInput(false);
                    setNewNote('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={handleAdd}
                  disabled={adding || !newNote.trim()}
                >
                  {adding ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Send className="h-3 w-3" />
                  )}
                  Salvar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse space-y-2 rounded-lg bg-muted/20 p-3">
              <div className="h-3 w-20 rounded bg-muted" />
              <div className="h-2.5 w-full rounded bg-muted/60" />
            </div>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <p className="py-3 text-center text-xs text-muted-foreground/50">Nenhuma nota ainda</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note, i) => {
            const colors = getAvatarColor(note.author_name || '');
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="group relative rounded-lg border border-border/20 bg-muted/20 p-3"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className={cn(colors.bg, colors.text, 'text-[8px] font-bold')}>
                      {getInitials(note.author_name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[10px] font-medium text-foreground">
                    {note.author_name}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(note.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">
                  {note.content}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-6 w-6 text-destructive/60 opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={() => handleDelete(note.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
