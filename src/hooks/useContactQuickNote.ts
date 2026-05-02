/**
 * useContactQuickNote.ts
 * Hook for adding quick notes to a contact directly from the chat sidebar.
 * 
 * Solves Gap #15: No inline note-taking during conversations.
 * Each note is timestamped with agent name, creating a mini activity feed.
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface QuickNote {
  id: string;
  text: string;
  agent_name: string;
  agent_id: string;
  created_at: string;
}

interface UseContactQuickNoteOptions {
  contactId: string;
  workspaceId: string;
  maxNotes?: number;
}

export function useContactQuickNote({ contactId, workspaceId, maxNotes = 50 }: UseContactQuickNoteOptions) {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('contact_notes')
        .select('id, text, agent_name, agent_id, created_at')
        .eq('contact_id', contactId)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(maxNotes);

      if (error) throw error;
      setNotes((data as QuickNote[]) ?? []);
    } catch (err) {
      console.error('[QuickNote] Load failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [contactId, workspaceId, maxNotes]);

  const addNote = useCallback(async (text: string) => {
    if (!text.trim() || !user) return;
    setIsSaving(true);
    try {
      const noteData = {
        contact_id: contactId,
        workspace_id: workspaceId,
        text: text.trim(),
        agent_id: user.id,
        agent_name: user.user_metadata?.full_name ?? user.email ?? 'Agente',
      };

      const { data, error } = await (supabase as any)
        .from('contact_notes')
        .insert(noteData)
        .select('id, text, agent_name, agent_id, created_at')
        .single();

      if (error) throw error;
      setNotes((prev) => [data as QuickNote, ...prev]);
      toast.success('Nota adicionada');
    } catch (err) {
      toast.error('Erro ao salvar nota');
      console.error('[QuickNote] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  }, [contactId, workspaceId, user]);

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('contact_notes')
        .delete()
        .eq('id', noteId)
        .eq('workspace_id', workspaceId);

      if (error) throw error;
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success('Nota removida');
    } catch (err) {
      toast.error('Erro ao remover nota');
      console.error('[QuickNote] Delete failed:', err);
    }
  }, [workspaceId]);

  return { notes, isLoading, isSaving, loadNotes, addNote, deleteNote };
}
