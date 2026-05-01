import { useEffect, useRef } from 'react';
import { logAudit } from '@/lib/audit';
import { User } from '@supabase/supabase-js';

export function useLoginAudit(user: User | null, loading: boolean) {
  const hasLoggedAudit = useRef(false);

  useEffect(() => {
    if (user && !loading && !hasLoggedAudit.current) {
      hasLoggedAudit.current = true;
      logAudit({ action: 'login', details: { email: user.email } });
    }
  }, [user, loading]);
}
