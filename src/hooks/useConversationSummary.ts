/**
 * useConversationSummary.ts
 * AI-powered conversation summary generator.
 * 
 * Generates concise summaries of conversations for:
 * - Transfer context (so receiving agent has full context)
 * - Supervisor overview
 * - Post-conversation audit
 * - CRM activity logs
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConversationSummary {
  id: string;
  conversation_id: string;
  summary: string;
  key_topics: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  resolution_status: 'resolved' | 'pending' | 'escalated';
  action_items: string[];
  generated_at: string;
  model_version: string;
}

export function useConversationSummary(workspaceId: string) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateSummary = useCallback(async (conversationId: string): Promise<ConversationSummary | null> => {
    setIsGenerating(true);
    try {
      // Call Edge Function that uses AI to summarize
      const { data, error } = await (supabase as any).functions.invoke('generate-conversation-summary', {
        body: {
          conversation_id: conversationId,
          workspace_id: workspaceId,
          max_messages: 100,
        },
      });

      if (error) throw error;

      const result = data as ConversationSummary;
      setSummary(result);

      // Persist summary
      await (supabase as any).from('conversation_summaries').upsert({
        conversation_id: conversationId,
        workspace_id: workspaceId,
        summary: result.summary,
        key_topics: result.key_topics,
        sentiment: result.sentiment,
        resolution_status: result.resolution_status,
        action_items: result.action_items,
        generated_at: new Date().toISOString(),
        model_version: result.model_version ?? 'gpt-4o-mini',
      }, {
        onConflict: 'conversation_id,workspace_id',
      });

      return result;
    } catch (err) {
      console.error('[ConversationSummary] Generation failed:', err);
      toast.error('Erro ao gerar resumo da conversa');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [workspaceId]);

  const loadSummary = useCallback(async (conversationId: string) => {
    const { data, error: res2373Err } = await (supabase as any)
      .from('conversation_summaries')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setSummary(data as ConversationSummary);
    }
  }, [workspaceId]);

  return { summary, isGenerating, generateSummary, loadSummary };
}
