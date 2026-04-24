/**
 * useMediaUrl — auto-refresh de URLs WhatsApp expiradas.
 *
 * As URLs assinadas servidas pelo WhatsApp expiram em ~24h. Quando o
 * frontend tenta exibir um <img>/<video> antigo, retorna 410/403 e o
 * usuário vê uma área quebrada. Este hook interpreta o erro de carga,
 * pede um refresh via `getMediaBase64` (Evolution `chat/getBase64`) e
 * devolve uma data URL utilizável no lugar.
 *
 * Uso:
 *   const { url, isRefreshing, onError } = useMediaUrl({
 *     instanceName: 'wpp2',
 *     originalUrl: msg.media_url,
 *     messageKey: { remoteJid, fromMe, id: msg.external_id },
 *   });
 *   <img src={url ?? msg.media_url} onError={onError} />
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';

const log = getLogger('useMediaUrl');

interface MessageKey {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

interface UseMediaUrlOptions {
  instanceName: string;
  originalUrl: string | null | undefined;
  messageKey: MessageKey | null;
  /** Disable auto-refresh (e.g. while still loading the message metadata). */
  enabled?: boolean;
  /** Forces a refresh even before the first error (rare; mainly for retries). */
  forceRefreshNonce?: number;
}

interface UseMediaUrlResult {
  url: string | null;
  isRefreshing: boolean;
  error: Error | null;
  /** Attach to <img onError={onError}> / <video onError={onError}>. */
  onError: () => void;
  /** Manually trigger a refresh. */
  refresh: () => Promise<void>;
}

const refreshCache = new Map<string, string>();

function cacheKey(instance: string, key: MessageKey): string {
  return `${instance}::${key.remoteJid}::${key.id}`;
}

export function useMediaUrl(opts: UseMediaUrlOptions): UseMediaUrlResult {
  const { instanceName, originalUrl, messageKey, enabled = true, forceRefreshNonce } = opts;
  const [url, setUrl] = useState<string | null>(originalUrl ?? null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  // Keep `url` in sync when the upstream metadata changes.
  useEffect(() => {
    setUrl(originalUrl ?? null);
    setError(null);
  }, [originalUrl]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!enabled || !messageKey || !instanceName) return;
    if (inFlightRef.current) return inFlightRef.current;

    const key = cacheKey(instanceName, messageKey);
    const cached = refreshCache.get(key);
    if (cached) {
      setUrl(cached);
      return;
    }

    setIsRefreshing(true);
    setError(null);
    const job = (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('evolution-api/get-media-base64', {
          method: 'POST',
          body: { instanceName, message: { key: messageKey } },
        });
        if (fnError) throw fnError;
        const payload = (data as { base64?: string; mimetype?: string } | null) ?? null;
        if (!payload?.base64) throw new Error('Empty media payload');
        const mime = payload.mimetype || 'application/octet-stream';
        const dataUrl = `data:${mime};base64,${payload.base64}`;
        refreshCache.set(key, dataUrl);
        setUrl(dataUrl);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        log.warn(`media refresh failed for ${key}: ${e.message}`);
        setError(e);
      } finally {
        setIsRefreshing(false);
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = job;
    return job;
  }, [enabled, instanceName, messageKey]);

  // Manual refresh trigger via nonce.
  useEffect(() => {
    if (forceRefreshNonce != null && forceRefreshNonce > 0) {
      void refresh();
    }
  }, [forceRefreshNonce, refresh]);

  const onError = useCallback(() => {
    void refresh();
  }, [refresh]);

  return { url, isRefreshing, error, onError, refresh };
}
