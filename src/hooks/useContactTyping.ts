import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';

const log = getLogger('ContactTyping');

/**
 * Tempo (ms) para auto-limpar o estado "digitando…" caso não venha novo
 * evento `composing`. Configurável por instância via env
 * `VITE_TYPING_AUTO_CLEAR_MS` (ex.: 3000, 5000, 8000). Clamp: 1s–30s.
 * Default: 5000ms.
 */
const DEFAULT_AUTO_CLEAR_MS = 5000;
const MIN_AUTO_CLEAR_MS = 1000;
const MAX_AUTO_CLEAR_MS = 30000;

function resolveAutoClearMs(): number {
  const raw = (import.meta.env?.VITE_TYPING_AUTO_CLEAR_MS as string | undefined)?.trim();
  if (!raw) return DEFAULT_AUTO_CLEAR_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_AUTO_CLEAR_MS;
  return Math.min(MAX_AUTO_CLEAR_MS, Math.max(MIN_AUTO_CLEAR_MS, Math.round(n)));
}

export const TYPING_AUTO_CLEAR_MS = resolveAutoClearMs();

/**
 * Hook leve read-only para escutar o broadcast `contact_typing` no canal
 * `typing:${remoteJid}`. Usado em listas (ConversationItem,
 * VirtualizedRealtimeList) onde queremos mostrar "digitando…" sem o overhead
 * de presence/track do hook completo `useTypingPresence`.
 *
 * Auto-clear configurável via `VITE_TYPING_AUTO_CLEAR_MS` (default 5000ms).
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
        // Auto-clear se não vier novo composing dentro do TTL configurado
        clearTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          clearTimeoutRef.current = null;
        }, TYPING_AUTO_CLEAR_MS);
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
