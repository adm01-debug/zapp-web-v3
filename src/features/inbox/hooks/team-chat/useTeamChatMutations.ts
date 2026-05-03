import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { toast } from '@/hooks/use-toast';

export function useSendTeamMessage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ conversationId, content, replyToId, mediaUrl, mediaType }: {
      conversationId: string; content: string; replyToId?: string; mediaUrl?: string; mediaType?: string;
    }) => {
      if (!profile) throw new Error('Not authenticated');
      const { data, error } = await supabase.from('team_messages').insert({
        conversation_id: conversationId, sender_id: profile.id, content,
        reply_to_id: replyToId || null, media_url: mediaUrl || null, media_type: mediaType || null,
      }).select().single();
      if (error) throw error;
      await supabase.from('team_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId);
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['team-messages', vars.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['team-conversations'] });
    },
    onError: () => { toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' }); },
  });
}

export function useDeleteTeamMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      const { error } = await supabase.from('team_messages').delete().eq('id', messageId);
      if (error) throw error;
      return { conversationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-messages', data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['team-conversations'] });
    },
    onError: () => { toast({ title: 'Erro ao excluir mensagem', variant: 'destructive' }); },
  });
}

export function useEditTeamMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, content, conversationId }: { messageId: string; content: string; conversationId: string }) => {
      const { error } = await supabase.from('team_messages').update({ content, is_edited: true, updated_at: new Date().toISOString() }).eq('id', messageId);
      if (error) throw error;
      return { conversationId };
    },
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['team-messages', data.conversationId] }); },
    onError: () => { toast({ title: 'Erro ao editar mensagem', variant: 'destructive' }); },
  });
}

export function useCreateTeamConversation() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, name, memberIds = [], departmentId }: { type: 'direct' | 'group' | 'department'; name?: string; memberIds?: string[]; departmentId?: string }) => {
      if (!profile) throw new Error('Not authenticated');

      if (type === 'direct' && memberIds.length === 1) {
        const otherId = memberIds[0];
        const { data: existing } = await supabase.from('team_conversation_members').select('conversation_id').eq('profile_id', profile.id);
        if (existing?.length) {
          for (const mem of existing) {
            const { data: conv } = await supabase.from('team_conversations').select('*').eq('id', mem.conversation_id).eq('type', 'direct').single();
            if (conv) {
              const { data: otherMem } = await supabase.from('team_conversation_members').select('id').eq('conversation_id', conv.id).eq('profile_id', otherId).single();
              if (otherMem) return conv;
            }
          }
        }
      }

      // If it's a department conversation, check if it already exists
      if (type === 'department' && departmentId) {
        const { data: existingDeptConv } = await supabase
          .from('team_conversations')
          .select('*')
          .eq('department_id', departmentId)
          .maybeSingle();
        
        if (existingDeptConv) return existingDeptConv;
      }

      const { data: conv, error: convErr } = await supabase.from('team_conversations').insert({ 
        type, 
        name: name || null, 
        created_by: profile.id,
        department_id: departmentId || null
      }).select().single();
      
      if (convErr) throw convErr;
      
      // If it's a group or direct, add specified members
      if (type !== 'department') {
        const allMembers = [profile.id, ...memberIds.filter(id => id !== profile.id)];
        const { error: memError } = await supabase.from('team_conversation_members').insert(allMembers.map(pid => ({ conversation_id: conv.id, profile_id: pid })));
        if (memError) throw memError;
      } else {
        // For department conversations, we can still add the creator for UI consistency in some lists
        const { error: memError } = await supabase.from('team_conversation_members').insert({ conversation_id: conv.id, profile_id: profile.id });
        if (memError) throw memError;
      }
      
      return conv;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['team-conversations'] }); },
    onError: () => { toast({ title: 'Erro ao criar conversa', variant: 'destructive' }); },
  });
}

export function useToggleMuteConversation() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, muted }: { conversationId: string; muted: boolean }) => {
      if (!profile) throw new Error('Not authenticated');
      const { error: muteError } = await supabase.from('team_conversation_members').update({ is_muted: muted }).eq('conversation_id', conversationId).eq('profile_id', profile.id);
      if (muteError) throw muteError;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['team-conversations'] }); },
    onError: () => { toast({ title: 'Erro ao alterar silenciar', variant: 'destructive' }); },
  });
}
