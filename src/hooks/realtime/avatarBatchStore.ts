/**
 * avatarBatchStore — Gerencia o carregamento e cache dos avatares do WhatsApp.
 * 
 * Problema: Componentes de conversa e chat montam em paralelo e tentam resolver
 * a URL do avatar (`profile_picture_url`) individualmente via RPC no FATOR X.
 * 
 * Solução:
 *  1. Coalesce: Agrupa JIDs solicitados em uma janela de 100ms.
 *  2. Batch RPC: Faz uma única chamada para resolver N avatares.
 *  3. Cache: Mantém as URLs em memória (30 min) e propaga via BroadcastChannel
 *     para outras abas evitarem chamadas repetidas.
 */
import { getExternalSupabase, isExternalConfigured } from '@/integrations/supabase/externalClient';
import { getLogger } from '@/lib/logger';

const log = getLogger('AvatarBatchStore');

const BATCH_WINDOW_MS = 100;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutos
const BC_NAME = 'avatar-updates';

interface AvatarCacheEntry {
  url: string | null;
  expiresAt: number;
}

// In-memory cache
const avatarCache = new Map<string, AvatarCacheEntry>();
// JIDs aguardando processamento na janela atual
const pendingJids = new Set<string>();
// Promises de resolução para JIDs em voo
const resolvers = new Map<string, Array<(url: string | null) => void>>();
// Timer da janela de batch
let batchTimer: ReturnType<typeof setTimeout> | null = null;
// Canal de broadcast para sync entre abas
let bc: BroadcastChannel | null = null;

if (typeof window !== 'undefined') {
  try {
    bc = new BroadcastChannel(BC_NAME);
    bc.onmessage = (e) => {
      const { jid, url } = e.data;
      if (jid && url !== undefined) {
        avatarCache.set(jid, { url, expiresAt: Date.now() + CACHE_TTL_MS });
        const list = resolvers.get(jid);
        if (list) {
          list.forEach(resolve => resolve(url));
          resolvers.delete(jid);
        }
      }
    };
  } catch { /* BroadcastChannel indisponível */ }
}

async function processBatch() {
  batchTimer = null;
  const jidsToFetch = Array.from(pendingJids);
  pendingJids.clear();

  if (jidsToFetch.length === 0) return;

  try {
    if (!isExternalConfigured) {
      jidsToFetch.forEach(jid => resolveJid(jid, null));
      return;
    }

    // RPC que deve retornar um objeto { [jid]: url | null }
    const { data, error } = await getExternalSupabase().rpc('get_avatars_by_jids_batch', {
      p_jids: jidsToFetch
    });

    if (error) {
      log.error('Erro ao buscar avatares em lote:', error);
      jidsToFetch.forEach(jid => resolveJid(jid, null));
      return;
    }

    const results = (data || {}) as Record<string, string | null>;
    
    jidsToFetch.forEach(jid => {
      const url = results[jid] ?? null;
      resolveJid(jid, url);
      // Sync com outras abas
      bc?.postMessage({ jid, url });
    });

  } catch (err) {
    log.error('Falha crítica no processBatch de avatares:', err);
    jidsToFetch.forEach(jid => resolveJid(jid, null));
  }
}

function resolveJid(jid: string, url: string | null) {
  avatarCache.set(jid, { url, expiresAt: Date.now() + CACHE_TTL_MS });
  const list = resolvers.get(jid);
  if (list) {
    list.forEach(resolve => resolve(url));
    resolvers.delete(jid);
  }
}

/**
 * Solicita a URL do avatar de um contato.
 * Retorna do cache se disponível, caso contrário entra no próximo lote.
 */
export async function getContactAvatar(jid: string): Promise<string | null> {
  if (!jid) return null;

  // 1. Check cache
  const cached = avatarCache.get(jid);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  // 2. Already in-flight?
  return new Promise((resolve) => {
    const list = resolvers.get(jid) || [];
    list.push(resolve);
    resolvers.set(jid, list);

    if (list.length === 1) {
      // First one to ask: add to pending and schedule flush
      pendingJids.add(jid);
      if (!batchTimer) {
        batchTimer = setTimeout(processBatch, BATCH_WINDOW_MS);
      }
    }
  });
}

/** Pre-popula o cache (usado quando a lista de contatos já traz a URL). */
export function seedAvatarCache(jid: string, url: string | null) {
  if (!jid) return;
  avatarCache.set(jid, { url, expiresAt: Date.now() + CACHE_TTL_MS });
}
