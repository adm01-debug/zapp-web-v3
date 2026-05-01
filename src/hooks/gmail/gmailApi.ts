/**
 * gmailApi.ts — Camada de chamadas à Gmail API
 *
 * Centraliza TODAS as chamadas à API do Gmail (via Edge Functions Supabase).
 * Evita acesso direto ao token no cliente por segurança.
 */

import { supabase } from '@/integrations/supabase/client';

export interface GmailSendOptions {
  accountId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  bodyPlain?: string;
  threadId?: string;  // para reply em thread existente
  attachments?: Array<{ name: string; mimeType: string; data: string /* base64 */ }>;
  signatureHtml?: string;
}

export interface GmailSyncOptions {
  accountId: string;
  maxResults?: number;
  labelIds?: string[];
  pageToken?: string;
}

export interface GmailListThreadsOptions {
  accountId: string;
  labelIds?: string[];
  q?: string;          // query de busca estilo Gmail
  pageToken?: string;
  maxResults?: number;
}

export interface GmailMarkReadOptions {
  accountId: string;
  messageIds: string[];
  read: boolean;
}

export interface GmailTrashOptions {
  accountId: string;
  messageId: string;
}

export interface GmailLabelOptions {
  accountId: string;
  messageId: string;
  addLabelIds?: string[];
  removeLabelIds?: string[];
}

export interface GmailDraftOptions {
  accountId: string;
  to?: string[];
  cc?: string[];
  subject?: string;
  bodyHtml?: string;
  draftId?: string;    // para atualizar rascunho existente
  threadId?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

async function callEdgeFn<T = unknown>(
  fn: string,
  body: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(fn, { body });
  if (error) throw new Error(error.message ?? `Edge function ${fn} falhou`);
  return data as T;
}

// ── Envio ──────────────────────────────────────────────────────────────

/**
 * Envia um email via Gmail API (Edge Function gmail-send).
 * Se signatureHtml for fornecida, é injetada antes do </body>.
 */
export async function gmailSendMessage(opts: GmailSendOptions) {
  const fullHtml = opts.signatureHtml
    ? opts.bodyHtml.replace('</body>', `${opts.signatureHtml}</body>`)
    : opts.bodyHtml;

  return callEdgeFn('gmail-send', {
    accountId: opts.accountId,
    to: opts.to,
    cc: opts.cc ?? [],
    bcc: opts.bcc ?? [],
    subject: opts.subject,
    bodyHtml: fullHtml,
    bodyPlain: opts.bodyPlain ?? '',
    threadId: opts.threadId,
    attachments: opts.attachments ?? [],
  });
}

// ── Sincronização ──────────────────────────────────────────────────────

/**
 * Dispara sincronização incremental via Gmail API (gmail-sync).
 * Usa historyId armazenado na conta para buscar apenas novidades.
 */
export async function gmailSyncAccount(opts: GmailSyncOptions) {
  return callEdgeFn('gmail-sync', {
    accountId: opts.accountId,
    maxResults: opts.maxResults ?? 50,
    labelIds: opts.labelIds ?? ['INBOX'],
    pageToken: opts.pageToken,
  });
}

// ── Leitura / Threads ──────────────────────────────────────────────────

/**
 * Lista threads com suporte a busca full-text (campo q).
 */
export async function gmailListThreads(opts: GmailListThreadsOptions) {
  return callEdgeFn<{ threads: unknown[]; nextPageToken?: string }>('gmail-sync', {
    action: 'listThreads',
    accountId: opts.accountId,
    labelIds: opts.labelIds ?? ['INBOX'],
    q: opts.q ?? '',
    pageToken: opts.pageToken,
    maxResults: opts.maxResults ?? 20,
  });
}

/**
 * Busca full-text nos emails do Supabase (sem chamar Gmail API).
 */
export async function gmailSearchLocal(accountId: string, query: string) {
  const { data, error } = await supabase
    .from('gmail_threads')
    .select('*, gmail_messages(*)')
    .eq('account_id', accountId)
    .textSearch('subject', query, { config: 'portuguese' })
    .order('last_message_at', { ascending: false })
    .limit(30);

  if (error) throw error;
  return data;
}

// ── Marcar lido/não-lido ───────────────────────────────────────────────

export async function gmailMarkRead(opts: GmailMarkReadOptions) {
  return callEdgeFn('gmail-send', {
    action: 'markRead',
    accountId: opts.accountId,
    messageIds: opts.messageIds,
    read: opts.read,
  });
}

// ── Lixeira ────────────────────────────────────────────────────────────

export async function gmailTrashMessage(opts: GmailTrashOptions) {
  return callEdgeFn('gmail-send', {
    action: 'trash',
    accountId: opts.accountId,
    messageId: opts.messageId,
  });
}

// ── Labels ─────────────────────────────────────────────────────────────

export async function gmailModifyLabels(opts: GmailLabelOptions) {
  return callEdgeFn('gmail-send', {
    action: 'modifyLabels',
    accountId: opts.accountId,
    messageId: opts.messageId,
    addLabelIds: opts.addLabelIds ?? [],
    removeLabelIds: opts.removeLabelIds ?? [],
  });
}

// ── Rascunhos ──────────────────────────────────────────────────────────

export async function gmailSaveDraft(opts: GmailDraftOptions) {
  return callEdgeFn('gmail-send', {
    action: 'saveDraft',
    accountId: opts.accountId,
    draftId: opts.draftId,
    to: opts.to ?? [],
    cc: opts.cc ?? [],
    subject: opts.subject ?? '',
    bodyHtml: opts.bodyHtml ?? '',
    threadId: opts.threadId,
  });
}

export async function gmailDeleteDraft(accountId: string, draftId: string) {
  return callEdgeFn('gmail-send', {
    action: 'deleteDraft',
    accountId,
    draftId,
  });
}

// ── OAuth / Token ──────────────────────────────────────────────────────

/**
 * Força o refresh do access token via Edge Function.
 * Chamado automaticamente pelo useGmailOAuthFlow quando token_expiry < now + 5min.
 */
export async function gmailRefreshToken(accountId: string) {
  return callEdgeFn<{ access_token: string; token_expiry: string }>(
    'gmail-oauth',
    { action: 'refresh', accountId },
  );
}

/**
 * Revoga o acesso OAuth e remove a conta do banco.
 */
export async function gmailRevokeAccount(accountId: string) {
  return callEdgeFn('gmail-oauth', { action: 'revoke', accountId });
}

/**
 * Registra/renova o Pub/Sub watch para receber emails em tempo real.
 */
export async function gmailRegisterWatch(accountId: string) {
  return callEdgeFn<{ expiration: string; historyId: string }>(
    'gmail-webhook',
    { action: 'registerWatch', accountId },
  );
}
