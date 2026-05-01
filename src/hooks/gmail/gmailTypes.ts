/**
 * gmailTypes.ts — Tipos compartilhados do módulo Gmail / Email Chat
 *
 * Centraliza todos os tipos usados por hooks e componentes do Email Chat.
 * Extendido pela auditoria de 2026-05-02 para cobrir todos os gaps identificados.
 */

// ── Contas ────────────────────────────────────────────────────────────

export interface GmailAccount {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  picture_url: string | null;
  access_token: string;
  refresh_token: string;
  token_expiry: string;           // ISO 8601
  scope: string | null;
  is_active: boolean;
  watch_expiry: string | null;    // Pub/Sub watch expiration
  watch_resource: string | null;
  history_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Threads ───────────────────────────────────────────────────────────

export interface GmailThread {
  id: string;
  account_id: string;
  thread_id: string;
  subject: string | null;
  snippet: string | null;
  participant_emails: string[];
  label_ids: string[];
  unread_count: number;
  message_count: number;
  last_message_at: string | null;
  is_starred: boolean;
  is_important: boolean;
  created_at: string;
  updated_at: string;

  // Joins opcionais
  messages?: GmailMessage[];
  labels?: GmailLabel[];
}

// ── Mensagens ─────────────────────────────────────────────────────────

export interface GmailMessage {
  id: string;
  thread_id_ref: string;
  account_id: string;
  message_id: string;
  from_email: string | null;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  subject: string | null;
  body_plain: string | null;
  body_html: string | null;
  snippet: string | null;
  label_ids: string[];
  is_read: boolean;
  is_sent: boolean;
  is_draft: boolean;
  has_attachments: boolean;
  internal_date: string | null;
  created_at: string;

  // Joins opcionais
  attachments?: GmailAttachment[];
}

// ── Anexos ────────────────────────────────────────────────────────────

export interface GmailAttachment {
  id: string;
  message_id_ref: string;
  account_id: string;
  attachment_id: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_url: string | null;
  downloaded: boolean;
  created_at: string;
}

// ── Rascunhos ─────────────────────────────────────────────────────────

export interface GmailDraft {
  id: string;
  account_id: string;
  thread_id_ref: string | null;
  gmail_draft_id: string | null;
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  subject: string | null;
  body_html: string | null;
  last_saved_at: string;
  created_at: string;
}

// ── Assinaturas ───────────────────────────────────────────────────────

export interface GmailSignature {
  id: string;
  account_id: string;
  name: string;
  html_content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// ── Labels ────────────────────────────────────────────────────────────

export interface GmailLabel {
  id: string;
  account_id: string;
  label_id: string;
  name: string;
  type: 'system' | 'user' | null;
  color_bg: string | null;
  color_fg: string | null;
  messages_total: number;
  messages_unread: number;
}

// ── Busca ─────────────────────────────────────────────────────────────

export interface GmailSearchResult {
  threadId: string;
  subject: string;
  snippet: string;
  from: string;
  date: string;
  unread: boolean;
  source: 'local' | 'remote';
}

// ── OAuth ─────────────────────────────────────────────────────────────

export type TokenStatus = 'loading' | 'valid' | 'expiring' | 'expired' | 'disconnected';

export interface OAuthCallbackPayload {
  type: 'gmail-oauth-success';
  email: string;
  accountId: string;
}

// ── SLA ──────────────────────────────────────────────────────────────

export type SLAStatus = 'ok' | 'warning' | 'breached';

export interface EmailSLAConfig {
  threshold_minutes: number;
  warning_threshold_pct: number;
  business_hours_only: boolean;
}

// ── Envio ─────────────────────────────────────────────────────────────

export interface ComposedEmail {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyHtml: string;
  bodyPlain?: string;
  attachments?: ComposedAttachment[];
  signatureId?: string;
  replyToThreadId?: string;
}

export interface ComposedAttachment {
  name: string;
  mimeType: string;
  data: string;         // base64
  sizeBytes: number;
}

// ── Paginação ─────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  nextPageToken: string | null;
  total: number;
}

// ── Realtime events ───────────────────────────────────────────────────

export type GmailRealtimeEvent =
  | { type: 'new_message'; threadId: string; messageId: string }
  | { type: 'thread_updated'; threadId: string }
  | { type: 'token_expired'; accountId: string }
  | { type: 'sync_complete'; accountId: string; count: number };
