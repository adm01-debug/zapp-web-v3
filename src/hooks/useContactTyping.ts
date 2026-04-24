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
 * Debounce do STOP (`isTyping=false`) para evitar flicker quando o WhatsApp
 * alterna rapidamente entre `composing` → `paused` → `composing`. O START
 * (`true`) é aplicado imediatamente; o STOP só é confirmado após
 * `VITE_TYPING_STOP_DEBOUNCE_MS` ms sem reativação. Clamp: 100ms–5s.
 * Default: 600ms.
 */
const DEFAULT_STOP_DEBOUNCE_MS = 600;
const MIN_STOP_DEBOUNCE_MS = 100;
const MAX_STOP_DEBOUNCE_MS = 5000;

function resolveStopDebounceMs(): number {
  const raw = (import.meta.env?.VITE_TYPING_STOP_DEBOUNCE_MS as string | undefined)?.trim();
  if (!raw) return DEFAULT_STOP_DEBOUNCE_MS;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_STOP_DEBOUNCE_MS;
  return Math.min(MAX_STOP_DEBOUNCE_MS, Math.max(MIN_STOP_DEBOUNCE_MS, Math.round(n)));
}

export const TYPING_STOP_DEBOUNCE_MS = resolveStopDebounceMs();

/**
 * Hook leve read-only para escutar o broadcast `contact_typing` no canal
 * `typing:${remoteJid}`. Usado em listas (ConversationItem,
 * VirtualizedRealtimeList) onde queremos mostrar "digitando…" sem o overhead
 * de presence/track do hook completo `useTypingPresence`.
 *
 * Auto-clear configurável via `VITE_TYPING_AUTO_CLEAR_MS` (default 5000ms).
 * Stop-debounce configurável via `VITE_TYPING_STOP_DEBOUNCE_MS` (default 600ms).
 * Defesa broadcast: ignora JIDs `@broadcast` e `@g.us`.
 *
 * Otimização: passe `enabled=false` para suspender a subscrição (ex.: cards
 * fora do viewport em listas longas) e evitar criar 1 canal por conversa.
 */
export function useContactTyping(remoteJid?: string | null, enabled: boolean = true): boolean {
  const [isTyping, setIsTyping] = useState(false);
  // Auto-clear (TTL longo) — limpa caso o emissor pare de enviar `composing`.
  const clearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stop-debounce (TTL curto) — adia a transição true→false para evitar
  // flicker em alternâncias rápidas composing↔paused vindas do WhatsApp.
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsTyping(false);
      return;
    }
    if (!remoteJid) {
      setIsTyping(false);
      return;
    }
    // Defesa broadcast: nunca subscrever JIDs de broadcast/grupo
    if (remoteJid.endsWith('@broadcast') || remoteJid.endsWith('@g.us')) {
      setIsTyping(false);
      return;
    }

    const clearAutoClear = () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
        clearTimeoutRef.current = null;
      }
    };
    const clearStopDebounce = () => {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
        stopTimeoutRef.current = null;
      }
    };

    const channel = supabase.channel(`typing:${remoteJid}`);

    channel.on('broadcast', { event: 'contact_typing' }, ({ payload }) => {
      const typing = (payload as { isTyping?: boolean })?.isTyping === true;

      if (typing) {
        // START: aplica imediatamente e cancela qualquer stop pendente para
        // que um STOP recente seguido de START não pisque o indicador.
        clearStopDebounce();
        clearAutoClear();
        setIsTyping(true);

        // Auto-clear se o emissor parar de enviar composing.
        clearTimeoutRef.current = setTimeout(() => {
          setIsTyping(false);
          clearTimeoutRef.current = null;
        }, TYPING_AUTO_CLEAR_MS);
        return;
      }

      // STOP: adia a confirmação por TYPING_STOP_DEBOUNCE_MS. Se um novo
      // START chegar dentro da janela, o stop é cancelado acima.
      clearStopDebounce();
      stopTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        stopTimeoutRef.current = null;
        clearAutoClear();
      }, TYPING_STOP_DEBOUNCE_MS);
    });

    channel.subscribe((status) => {
      if (status === 'CHANNEL_ERROR') {
        log.warn('Typing channel error for', remoteJid);
      }
    });

    return () => {
      clearAutoClear();
      clearStopDebounce();
      supabase.removeChannel(channel);
    };
  }, [remoteJid, enabled]);

  return isTyping;
}
