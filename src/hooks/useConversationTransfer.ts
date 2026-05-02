/**
 * useConversationTransfer.ts
 * Seamless conversation handoff between agents with full context.
 * 
 * Features:
 * - Transfer to specific agent, queue, or department
 * - Attach transfer reason/note
 * - Preserve conversation context (summary, SLA state, tags)
 * - Warm transfer (both agents in conversation) vs cold transfer
 * - Transfer history tracking for audit
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { dbFrom } from '@/integrations/datasource/db';

export type TransferType = 'cold' | 'warm';
export type TransferTarget = 'agent' | 'queue' | 'department';

interface TransferRequest {
  conversationId: string;
  targetType: TransferTarget;
  targetId: string;
  targetName: string;
  transferType: TransferType;
  reason?: string;
  note?: string;
  preserveSla?: boolean;
  includeHistory?: boolean;
}

interface TransferResult {
  success: boolean;
  transferId: string | null;
  error: string | null;
}

interface TransferHistoryEntry {
  id: string;
  conversation_id: string;
  from_agent_id: string;
  from_agent_name: string;
  to_agent_id: string | null;
  to_queue_id: string | null;
  to_department: string | null;
  transfer_type: TransferType;
  reason: string | null;
  note: string | null;
  created_at: string;
  accepted_at: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

export function useConversationTransfer(workspaceId: string) {
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferHistory, setTransferHistory] = useState<TransferHistoryEntry[]>([]);
  const { user } = useAuth();

  const transfer = useCallback(async (request: TransferRequest): Promise<TransferResult> => {
    if (!user) return { success: false, transferId: null, error: 'N\u00e3o autenticado' };
    setIsTransferring(true);

    try {
      // 1. Create transfer record
      const transferData: Record<string, unknown> = {
        workspace_id: workspaceId,
        conversation_id: request.conversationId,
        from_agent_id: user.id,
        from_agent_name: user.user_metadata?.full_name ?? user.email,
        transfer_type: request.transferType,
        reason: request.reason ?? null,
        note: request.note ?? null,
        status: request.transferType === 'cold' ? 'accepted' : 'pending',
      };

      if (request.targetType === 'agent') {
        transferData.to_agent_id = request.targetId;
      } else if (request.targetType === 'queue') {
        transferData.to_queue_id = request.targetId;
      } else {
        transferData.to_department = request.targetId;
      }

      const { data: transfer, error: transferError } = await (supabase as any)
        .from('conversation_transfers')
        .insert(transferData)
        .select('id')
        .single();

      if (transferError) throw transferError;

      // 2. Update conversation assignment
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (request.transferType === 'cold') {
        if (request.targetType === 'agent') {
          updateData.assigned_agent_id = request.targetId;
          updateData.assigned_agent_name = request.targetName;
        } else if (request.targetType === 'queue') {
          updateData.queue_id = request.targetId;
          updateData.assigned_agent_id = null;
          updateData.assigned_agent_name = null;
          updateData.status = 'pending';
        }
      }

      if (!request.preserveSla) {
        updateData.sla_started_at = new Date().toISOString();
      }

      const { error: updateError } = await dbFrom('conversations')
        .update(updateData)
        .eq('id', request.conversationId)
        .eq('workspace_id', workspaceId);

      if (updateError) throw updateError;

      // 3. Add system message about the transfer
      await dbFrom('messages').insert({
        conversation_id: request.conversationId,
        workspace_id: workspaceId,
        content: `Conversa transferida para ${request.targetName}${request.reason ? ` \u2014 Motivo: ${request.reason}` : ''}`,
        sender_type: 'system',
        message_type: 'system',
        metadata: {
          system_event: 'transfer',
          transfer_id: transfer.id,
          transfer_type: request.transferType,
          from_agent: user.user_metadata?.full_name ?? user.email,
          to_target: request.targetName,
        },
      });

      // 4. Log to audit
      await (supabase as any).from('audit_logs').insert({
        workspace_id: workspaceId,
        entity_type: 'conversation',
        entity_id: request.conversationId,
        action: 'transfer',
        agent_id: user.id,
        details: {
          transfer_id: transfer.id,
          target_type: request.targetType,
          target_name: request.targetName,
          transfer_type: request.transferType,
          reason: request.reason,
        },
      });

      toast.success(`Conversa transferida para ${request.targetName}`);
      return { success: true, transferId: transfer.id, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na transfer\u00eancia';
      toast.error(msg);
      return { success: false, transferId: null, error: msg };
    } finally {
      setIsTransferring(false);
    }
  }, [user, workspaceId]);

  const loadTransferHistory = useCallback(async (conversationId: string) => {
    const { data, error } = await (supabase as any)
      .from('conversation_transfers')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setTransferHistory(data as TransferHistoryEntry[]);
    }
  }, [workspaceId]);

  const acceptTransfer = useCallback(async (transferId: string, conversationId: string) => {
    if (!user) return;
    await (supabase as any)
      .from('conversation_transfers')
      .update({ status: 'accepted', accepted_at: new Date().toISOString() })
      .eq('id', transferId);

    await dbFrom('conversations')
      .update({
        assigned_agent_id: user.id,
        assigned_agent_name: user.user_metadata?.full_name ?? user.email,
        status: 'open',
      })
      .eq('id', conversationId);

    toast.success('Transfer\u00eancia aceita');
  }, [user]);

  const rejectTransfer = useCallback(async (transferId: string) => {
    await (supabase as any)
      .from('conversation_transfers')
      .update({ status: 'rejected' })
      .eq('id', transferId);

    toast.info('Transfer\u00eancia recusada');
  }, []);

  return {
    transfer,
    isTransferring,
    transferHistory,
    loadTransferHistory,
    acceptTransfer,
    rejectTransfer,
  };
}
