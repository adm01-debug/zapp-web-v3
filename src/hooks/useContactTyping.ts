import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';

const log = getLogger('ContactTyping');

/**
 * Hook leve read-only para escutar o broadcast `contact_typing` no canal
 * `typing:${remoteJid}`. Usado em listas (ConversationItem,
 * VirtualizedRealtimeList) onde queremos mostrar "digitando…" sem o overhead
 * de presence/track do hook completo `useTypingPresence`.
 *
 * Auto-clear em 5s sem novo evento `composing`.
 * Defesa broadcast: ignora JIDs `@broadcast` e `@g.us`.
 */
export function useContactTyping(remoteJid?: string | null): boolean {
  const [isTyping, setIsTyping] = useState(false);
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!remoteJid) {
      setIsTyping(false);
      return;
    }
    // Defesa broadcast: nunca subscrever JIDs de broadcast/grupo
    if (remoteJid.endsWith('@broadcast') || remoteJid.endsWith('@g.us')) {
      setIsTyping(false);
      return;
    }

    const channel = supabase.channel(`typing:${remoteJid}`);

    channel.on('broadcast', { event: 'contact_typing' }, ({ payload }) => {
      const typing = (payload as { isTyping?: boolean })?.isTyping === true;

      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }

      setIsTyping(typing);

      if (typing) {
        // Auto-clear se não vier novo composing em 5s
        clearTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          clearTimeoutRef.current = null;
        }, 5000);
      }
    });

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        log.warn('Typing channel error for', remoteJid);
      }
    });

    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [remoteJid]);

  return isTyping;
}
