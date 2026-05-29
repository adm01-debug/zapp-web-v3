import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type SubscriptionConfig = {
  channelName: string;
  table: string;
  schema?: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onPayload: (payload: any) => void;
  enabled?: boolean;
};

/**
 * Hook for Supabase realtime subscriptions with automatic cleanup.
 * Prevents memory leaks by properly unsubscribing on unmount.
 *
 * @example
 * useRealtimeSubscription({
 *   channelName: 'messages-realtime',
 *   table: 'messages',
 *   event: 'INSERT',
 *   onPayload: (payload) => handleNewMessage(payload.new),
 * });
 */
export function useRealtimeSubscription(config: SubscriptionConfig) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (config.enabled === false) return;

    const channel = supabase
      .channel(config.channelName)
      .on(
        'postgres_changes' as any,
        {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table,
          filter: config.filter,
        } as any,
        config.onPayload as any
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] Channel ${config.channelName} error`);
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [config.channelName, config.table, config.event, config.filter, config.enabled]);
}
