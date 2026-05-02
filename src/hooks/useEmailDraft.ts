
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { safeClient } from '@/integrations/supabase/safeClient';
import { gmailSaveDraft, gmailDeleteDraft } from './gmail/gmailApi';
import { GmailDraft } from '@/types/gmail';

const supabase = _supabase as any;
const AUTO_SAVE_DELAY_MS = 30_000;

export interface DraftState {
  id?: string;
  gmail_draft_id?: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyHtml: string;
  isDirty: boolean;
  lastSaved?: Date;
}

export function useEmailDraft(accountId: string | null, threadId?: string) {
  const [draft, setDraft] = useState<DraftState>({
    to: [], cc: [], subject: '', bodyHtml: '', isDirty: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async (state: DraftState) => {
    if (!accountId || !state.isDirty) return;
    setIsSaving(true);

    try {
      const payload = {
        account_id: accountId,
        thread_id_ref: threadId ?? null,
        to_emails: state.to,
        cc_emails: state.cc,
        subject: state.subject,
        body_html: state.bodyHtml,
        last_saved_at: new Date().toISOString(),
      };

      let localId = state.id;

      if (localId) {
        await safeClient.from('gmail_drafts', (q) => q.update(payload).eq('id', localId));
      } else {
        const { data, error } = await supabase
          .from('gmail_drafts')
          .insert(payload)
          .select('id')
          .single();
        localId = data?.id;
      }

      const gmailResult = await gmailSaveDraft({
        accountId,
        draftId: state.gmail_draft_id,
        to: state.to,
        cc: state.cc,
        subject: state.subject,
        bodyHtml: state.bodyHtml,
        threadId,
      });

      setDraft(prev => ({
        ...prev,
        id: localId,
        gmail_draft_id: (gmailResult as any)?.draftId,
        isDirty: false,
        lastSaved: new Date(),
      }));
    } catch (err) {
      console.error('[useEmailDraft] Erro ao salvar rascunho:', err);
    } finally {
      setIsSaving(false);
    }
  }, [accountId, threadId]);

  const update = useCallback((patch: Partial<Omit<DraftState, 'isDirty'>>) => {
    setDraft(prev => ({ ...prev, ...patch, isDirty: true }));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDraft(current => { save(current); return current; });
    }, AUTO_SAVE_DELAY_MS);
  }, [save]);

  const discard = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (draft.id) {
      await safeClient.from('gmail_drafts', (q) => q.delete().eq('id', draft.id));
    }
    if (accountId && draft.gmail_draft_id) {
      await gmailDeleteDraft(accountId, draft.gmail_draft_id);
    }

    setDraft({ to: [], cc: [], subject: '', bodyHtml: '', isDirty: false });
  }, [accountId, draft]);

  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    save(draft);
  }, [draft, save]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { draft, update, save: saveNow, discard, isSaving };
}
