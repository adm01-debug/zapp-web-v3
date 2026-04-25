import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

export interface QrAttemptRecord {
  id: string;
  status: 'pending' | 'connected' | 'expired' | 'error';
  error_message: string | null;
  connected_at: string | null;
  expired_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Loads the most recent QR refresh attempt for a given connection so the
 * connection dialog can surface the last attempt time + result. Re-fetches
 * whenever `refreshKey` changes (e.g. after a new QR is generated or the
 * dialog status transitions), keeping the displayed record fresh without
 * needing a full realtime subscription.
 */
export function useLastQrAttempt(connectionId: string | null, refreshKey?: unknown) {
  const [attempt, setAttempt] = useState<QrAttemptRecord | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!connectionId) {
      setAttempt(null);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('qr_attempts')
        .select('id,status,error_message,connected_at,expired_at,created_at,updated_at')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        log.warn('[useLastQrAttempt] load failed', error);
        setAttempt(null);
      } else {
        setAttempt((data as QrAttemptRecord | null) ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  return { attempt, loading, reload: load };
}
