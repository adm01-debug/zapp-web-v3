/**
 * volumeStore — preferências de volume por usuário, com escopos hierárquicos.
 *
 * Hierarquia (mais específico ganha):
 *   1. per-conversation override (ex: "5511@c.us" → 0.8)
 *   2. global default (fallback)
 *
 * Persistência: localStorage. Não vai pro backend porque é uma preferência
 * de UI por dispositivo (volume confortável depende do hardware do usuário).
 *
 * Reativo: componentes podem `subscribe` para reagir a mudanças vindas de
 * outros players da mesma conversa (ou outras abas via storage event).
 */

const GLOBAL_KEY = 'audio-player:volume';
const CONV_PREFIX = 'audio-player:volume:conv:';
const DEFAULT_VOLUME = 1;

function clamp(v: number): number {
  if (!isFinite(v) || isNaN(v)) return DEFAULT_VOLUME;
  return Math.min(1, Math.max(0, v));
}

function readKey(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const n = parseFloat(raw);
    return isFinite(n) ? clamp(n) : null;
  } catch { return null; }
}

function writeKey(key: string, value: number): void {
  try { localStorage.setItem(key, String(clamp(value))); } catch { /* noop */ }
}

function deleteKey(key: string): void {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

function convKey(conversationId: string): string {
  return `${CONV_PREFIX}${conversationId}`;
}

type Listener = (volume: number, scope: 'global' | 'conversation', conversationId?: string) => void;
const listeners = new Set<Listener>();

function emit(volume: number, scope: 'global' | 'conversation', conversationId?: string) {
  for (const fn of listeners) {
    try { fn(volume, scope, conversationId); } catch { /* listeners não devem quebrar set */ }
  }
}

// Escuta storage events (sync entre abas).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (e.key === GLOBAL_KEY) {
      const n = e.newValue !== null ? parseFloat(e.newValue) : DEFAULT_VOLUME;
      emit(clamp(n), 'global');
    } else if (e.key.startsWith(CONV_PREFIX)) {
      const id = e.key.slice(CONV_PREFIX.length);
      const n = e.newValue !== null ? parseFloat(e.newValue) : DEFAULT_VOLUME;
      emit(clamp(n), 'conversation', id);
    }
  });
}

export const volumeStore = {
  /** Volume global default. */
  getGlobal(): number {
    return readKey(GLOBAL_KEY) ?? DEFAULT_VOLUME;
  },

  /** Define o volume global. */
  setGlobal(v: number): void {
    const clamped = clamp(v);
    writeKey(GLOBAL_KEY, clamped);
    emit(clamped, 'global');
  },

  /** Volume específico da conversa, ou null se não há override. */
  getConversation(conversationId: string): number | null {
    return readKey(convKey(conversationId));
  },

  /** Define um volume específico da conversa (cria override). */
  setConversation(conversationId: string, v: number): void {
    const clamped = clamp(v);
    writeKey(convKey(conversationId), clamped);
    emit(clamped, 'conversation', conversationId);
  },

  /** Remove o override da conversa, voltando a usar o global. */
  clearConversation(conversationId: string): void {
    deleteKey(convKey(conversationId));
    emit(volumeStore.getGlobal(), 'conversation', conversationId);
  },

  /**
   * Resolve o volume efetivo aplicando a hierarquia
   * (conversation > global). Se não há conversation, retorna global.
   */
  getEffective(conversationId?: string | null): number {
    if (conversationId) {
      const conv = readKey(convKey(conversationId));
      if (conv !== null) return conv;
    }
    return volumeStore.getGlobal();
  },

  /** Subscribe a mudanças (todas as cenas, todas as conversas). */
  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
