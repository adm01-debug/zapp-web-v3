/**
 * useLGPDWebhookSync.ts
 * Webhook-based LGPD consent sync between WhatsApp opt-out and CRM.
 * Solves Gap #8: No bidirectional LGPD sync with WhatsApp.
 *
 * Listens for opt-out events from WhatsApp (via Evolution API webhook)
 * and updates the contact's LGPD consent status in Supabase.
 */
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { dbFrom } from '@/integrations/datasource/db';

interface LGPDSyncEvent {
  contact_id: string;
  event_type: 'opt_out' | 'opt_in' | 'data_deletion_request';
  channel: string;
  timestamp: string;
  remote_jid?: string;
}

interface UseLGPDWebhookSyncOptions {
  workspaceId: string;
  enabled?: boolean;
  onOptOut?: (contactId: string) => void;
  onOptIn?: (contactId: string) => void;
  onDeletionRequest?: (contactId: string) => void;
}

export function useLGPDWebhookSync({
  workspaceId, enabled = true, onOptOut, onOptIn, onDeletionRequest,
}: UseLGPDWebhookSyncOptions) {
  const handleSyncEvent = useCallback(async (event: LGPDSyncEvent) => {
    switch (event.event_type) {
      case 'opt_out': {
        const { error } = await dbFrom('contacts')
          .update({
            lgpd_opt_out_at: event.timestamp,
            lgpd_marketing_consent: false,
            lgpd_data_sharing: false,
          })
          .eq('id', event.contact_id)
          .eq('workspace_id', workspaceId);
        if (!error) {
          toast.info('Contato solicitou opt-out via WhatsApp');
          onOptOut?.(event.contact_id);
        }
        break;
      }
      case 'opt_in': {
        const { error } = await dbFrom('contacts')
          .update({
            lgpd_consent_at: event.timestamp,
            lgpd_consent_channel: event.channel,
            lgpd_opt_out_at: null,
            lgpd_marketing_consent: true,
          })
          .eq('id', event.contact_id)
          .eq('workspace_id', workspaceId);
        if (!error) {
          toast.success('Contato deu consentimento via WhatsApp');
          onOptIn?.(event.contact_id);
        }
        break;
      }
      case 'data_deletion_request': {
        // Log the request, don't auto-delete — LGPD requires review
        await supabase.from('audit_logs').insert({
          workspace_id: workspaceId,
          entity_type: 'contact',
          entity_id: event.contact_id,
          action: 'lgpd_deletion_request',
          details: { channel: event.channel, remote_jid: event.remote_jid },
        });
        toast.warning('Solicitação de exclusão de dados recebida (LGPD)');
        onDeletionRequest?.(event.contact_id);
        break;
      }
    }
  }, [workspaceId, onOptOut, onOptIn, onDeletionRequest]);

  useEffect(() => {
    if (!enabled) return;

    // Subscribe to lgpd_sync_events table for realtime webhook events
    const channel: RealtimeChannel = supabase
      .channel(`lgpd-sync-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lgpd_sync_events',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          handleSyncEvent(payload.new as LGPDSyncEvent);
        }
      )
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [workspaceId, enabled, handleSyncEvent]);
}
