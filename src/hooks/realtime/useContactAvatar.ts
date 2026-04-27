import { useState, useEffect } from 'react';
import { getContactAvatar } from './avatarBatchStore';
import { getLogger } from '@/lib/logger';

const log = getLogger('useContactAvatar');

/**
 * Hook para obter o avatar de um contato com carregamento em lote e cache.
 */
export function useContactAvatar(jid: string | null | undefined, initialUrl?: string | null) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialUrl || null);
  const [loading, setLoading] = useState(!initialUrl && !!jid);

  useEffect(() => {
    if (initialUrl) {
      setAvatarUrl(initialUrl);
      setLoading(false);
      return;
    }

    if (!jid) {
      setAvatarUrl(null);
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    getContactAvatar(jid).then((url) => {
      if (mounted) {
        setAvatarUrl(url);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [jid, initialUrl]);

  return { avatarUrl, loading };
}
