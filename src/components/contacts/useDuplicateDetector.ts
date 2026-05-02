/**
 * useDuplicateDetector.ts
 * Real-time duplicate detection for contact forms.
 * Debounced phone+email check against workspace contacts.
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { normalizePhone } from '@/lib/phoneUtils';

export interface PotentialDuplicate {
  id: string; name: string; phone: string | null; email: string | null; channel: string | null;
}

export function useDuplicateDetector({ workspaceId, excludeId, debounceMs = 600 }: { workspaceId: string; excludeId?: string; debounceMs?: number }) {
  const [duplicates, setDuplicates] = useState<PotentialDuplicate[]>([]);
  const [hasDuplicates, setHas] = useState(false);
  const [checking, setChecking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const checkDuplicates = useCallback((phone: string, email: string) => {
    clearTimeout(timer.current);
    const np = phone?.trim() ? normalizePhone(phone) : null;
    const ne = email?.trim()?.toLowerCase() || null;
    if (!np && !ne) { setDuplicates([]); setHas(false); return; }

    timer.current = setTimeout(async () => {
      setChecking(true);
      try {
        const conds = [...(np ? [`phone.eq.${np}`] : []), ...(ne ? [`email.eq.${ne}`] : [])];
        let q = supabase.from('contacts').select('id,name,phone,email,channel').eq('workspace_id', workspaceId).is('deleted_at', null).or(conds.join(',')).limit(5);
        if (excludeId) q = q.neq('id', excludeId);
        const { data } = await q;
        const found = (data ?? []) as PotentialDuplicate[];
        setDuplicates(found); setHas(found.length > 0);
      } catch (err) { console.error('[useDuplicateDetector]', err); }
      finally { setChecking(false); }
    }, debounceMs);
  }, [workspaceId, excludeId, debounceMs]);

  const clear = useCallback(() => { clearTimeout(timer.current); setDuplicates([]); setHas(false); }, []);
  return { duplicates, hasDuplicates, checking, checkDuplicates, clear };
}
