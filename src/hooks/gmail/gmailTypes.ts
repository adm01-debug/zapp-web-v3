/**
 * gmailTypes.ts — Tipos TypeScript completos para o módulo Gmail
 *
 * Zero uso de `as any`.
 * Alinhado com o schema do banco (gmail_accounts, gmail_threads, gmail_messages, etc.)
 */

// ── Conta Gmail ────────────────────────────────────────────────────────────

export interface GmailAccount {
  id:           string;
  user_id:      string;
  email:        string;
  display_name: string | null;
  is_active:    boolean;
  token_expiry: string | null;
  watch_expiry: string | null;
  created_at:   string;
  updated_at:   string;
}

export type GmailTokenStatus  = 'valid' | 'expiring_soon' | 'expired' | 'no_token';
export type GmailWatchStatus  = 'active' | 'expiring_soon' | 'expired' | 'no_watch';
export type GmailSLAStatus    = 'ok' | 'warning' | 'breached' | 'met' | null;

export interface GmailTokenInfo {
  account_id:           string;
  email:                string;
  is_active:            boolean;
  token_status:         GmailTokenStatus;
  token_expiry:         string | null;
  watch_status:         GmailWatchStatus;
  watch_expiry:         string | null;
  minutes_until_expiry: number | null;
}

// ── Thread ─────────────────────────────────────────────────────────────────

export interface GmailThread {
  id:               string;
  account_id:       string;
  gmail_thread_id:  string;
  /** @deprecated Alias legado para `gmail_thread_id`. */
  thread_id?:       string;
  subject:          string | null;
  snippet:          string | null;
  from_email:       string | null;
  from_name:        string | null;
  label_ids:        string[];
  unread_count:     number;
  message_count:    number;
  is_starred:       boolean;
  is_important:     boolean;
  sla_status:       GmailSLAStatus;
  assigned_to:      string | null;
  last_message_at:  string | null;
  first_reply_at:   string | null;
  created_at:       string;
  updated_at:       string;
  /** @deprecated Lista de e-mails dos participantes (legado). */
  participant_emails?: string[];
}

export interface GmailThreadFilters {
  accountId?:   string;
  label?:       GmailLabelId;
  query?:       string;
  isUnread?:    boolean;
  isStarred?:   boolean;
  slaStatus?:   GmailSLAStatus;
  assignedTo?:  string | null;
  limit?:       number;
  offset?:      number;
}

// ── Mensagem ───────────────────────────────────────────────────────────────

export interface GmailMessage {
  id:              string;
  thread_id:       string;
  gmail_msg_id:    string;
  /** @deprecated Alias legado para `gmail_msg_id`. */
  message_id?:     string;
  from_email:      string | null;
  from_name:       string | null;
  to_emails:       string[] | null;
  cc_emails:       string[] | null;
  subject:         string | null;
  snippet:         string | null;
  body_html:       string | null;
  body_text:       string | null;
  /** @deprecated Alias legado para `body_text`. */
  body_plain?:     string | null;
  is_read:         boolean;
  /** @deprecated Indica se foi enviada pela conta (legado). */
  is_sent?:        boolean;
  date:            string | null;
  /** @deprecated Timestamp interno do Gmail (legado). */
  internal_date?:  string | null;
  has_attachments: boolean;
  in_reply_to:     string | null;
  references:      string[] | null;
  /** @deprecated Lista de label ids (legado, use a tabela própria). */
  label_ids?:      string[];
  created_at:      string;
}

// ── Anexo ─────────────────────────────────────────────────────────────────

export interface GmailAttachment {
  id:             string;
  message_id:     string;
  gmail_att_id:   string;
  filename:       string;
  mime_type:      string;
  size:           number;
  /** @deprecated Alias legado para `size`. */
  size_bytes?:    number;
  storage_url:    string | null;
  created_at:     string;
}

// ── Rascunho ──────────────────────────────────────────────────────────────

export interface GmailDraft {
  id:          string;
  account_id:  string;
  gmail_draft_id: string | null;
  to_emails:   string[];
  cc_emails:   string[];
  subject:     string | null;
  body_html:   string | null;
  thread_id:   string | null;
  auto_saved:  boolean;
  created_at:  string;
  updated_at:  string;
}

// ── Label ─────────────────────────────────────────────────────────────────

export type GmailLabelId = 'INBOX' | 'SENT' | 'DRAFTS' | 'STARRED' | 'IMPORTANT' | 'TRASH' | 'SPAM' | string;

export interface GmailLabel {
  id:             string;
  account_id:     string;
  gmail_label_id: GmailLabelId;
  name:           string;
  type:           'system' | 'user';
  color:          string | null;
  thread_count?:  number;
  unread_count?:  number;
  created_at:     string;
}

// ── Assinatura ────────────────────────────────────────────────────────────

export interface GmailSignature {
  id:           string;
  account_id:   string;
  name:         string;
  html_content: string;
  is_default:   boolean;
  created_at:   string;
  updated_at:   string;
}

// ── Envio ─────────────────────────────────────────────────────────────────

export interface GmailSendParams {
  to:          string | string[];
  cc?:         string | string[];
  bcc?:        string | string[];
  subject:     string;
  bodyHtml:    string;
  threadId?:   string;
  inReplyTo?:  string;
  references?: string[];
  attachments?: GmailSendAttachment[];
  signature?:  boolean;
}

export interface GmailSendAttachment {
  name:        string;
  /** @deprecated Alias legado para `name`. */
  filename?:   string;
  mimeType:    string;
  base64Data?: string;
  /** @deprecated Alias legado para `base64Data`. */
  data?:       string;
  size?:       number;
}

export interface GmailSendResult {
  success:    boolean;
  messageId?: string;
  threadId?:  string;
  error?:     string;
}

// ── Métricas diárias ─────────────────────────────────────────────────────

export interface GmailDailyMetrics {
  id:                      string;
  account_id:              string;
  date:                    string;
  threads_received:        number;
  threads_replied:         number;
  avg_first_reply_minutes: number | null;
  sla_met_count:           number;
  sla_breached_count:      number;
  created_at:              string;
  updated_at:              string;
}

// ── Pub/Sub webhook payload ───────────────────────────────────────────────

export interface GmailPubSubMessage {
  emailAddress:  string;
  historyId:     string;
}

export interface GmailHistoryEvent {
  id:              string;
  messages?:       Array<{ id: string; threadId: string }>;
  messagesAdded?:  Array<{ message: { id: string; threadId: string; labelIds: string[] } }>;
  labelsAdded?:    Array<{ message: { id: string; threadId: string }; labelIds: string[] }>;
  labelsRemoved?:  Array<{ message: { id: string; threadId: string }; labelIds: string[] }>;
}

// ── Type guards ──────────────────────────────────────────────────────────

export function isGmailThread(obj: unknown): obj is GmailThread {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'gmail_thread_id' in obj &&
    'account_id' in obj
  );
}

export function isGmailMessage(obj: unknown): obj is GmailMessage {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'gmail_msg_id' in obj &&
    'thread_id' in obj
  );
}

export function isGmailTokenExpired(tokenInfo: GmailTokenInfo): boolean {
  return tokenInfo.token_status === 'expired';
}

export function isGmailWatchExpired(tokenInfo: GmailTokenInfo): boolean {
  return tokenInfo.watch_status === 'expired';
}
