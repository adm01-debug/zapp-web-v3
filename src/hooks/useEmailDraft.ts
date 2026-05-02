/**
 * useEmailDraft.ts — Salvamento automático de rascunhos de email
 *
 * Salva o rascunho no Supabase a cada 30s enquanto o usuário digita.
 * Também sincroniza com a Gmail API via Edge Function.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { gmailSaveDraft, gmailDeleteDraft } from './gmail/gmailApi';

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

  // Salva rascunho no Supabase + Gmail API
  const save = useCallback(async (state: DraftState) => {
    if (!accountId || !state.isDirty) return;
    setIsSaving(true);

    try {
      // 1. Salvar/atualizar no Supabase
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
        await (supabase as any).from('gmail_drafts' as any).update(payload).eq('id', localId);
      } else {
        const { data } = await (supabase as any)
          .from('gmail_drafts' as any)
          .insert(payload)
          .select('id')
          .single();
        localId = (data as any)?.id;
      }

      // 2. Sincronizar com Gmail API
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
        gmail_draft_id: (gmailResult as { draftId?: string })?.draftId,
        isDirty: false,
        lastSaved: new Date(),
      }));
    } catch {
      // Falha silenciosa — salvo local já garante não perder dados
    } finally {
      setIsSaving(false);
    }
  }, [accountId, threadId]);

  // Atualiza campo e agenda auto-save
  const update = useCallback((patch: Partial<Omit<DraftState, 'isDirty'>>) => {
    setDraft(prev => ({ ...prev, ...patch, isDirty: true }));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDraft(current => { save(current); return current; });
    }, AUTO_SAVE_DELAY_MS);
  }, [save]);

  // Descarta rascunho
  const discard = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (draft.id) {
      await (supabase as any).from('gmail_drafts' as any).delete().eq('id', draft.id);
    }
    if (accountId && draft.gmail_draft_id) {
      await gmailDeleteDraft(accountId, draft.gmail_draft_id);
    }

    setDraft({ to: [], cc: [], subject: '', bodyHtml: '', isDirty: false });
  }, [accountId, draft]);

  // Forçar save imediato (ex: ao fechar a tela)
  const saveNow = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    save(draft);
  }, [draft, save]);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { draft, update, save: saveNow, discard, isSaving };
}
