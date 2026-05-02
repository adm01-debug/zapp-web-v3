
/**
 * gmail.ts — Tipagens compartilhadas para o domínio de Gmail e Email unificado.
 */

export type EmailProvider = 'gmail' | 'outlook' | 'yahoo' | 'custom';
export type GmailTokenStatus = 'valid' | 'expiring_soon' | 'expired' | 'no_token';
export type GmailWatchStatus = 'active' | 'expiring_soon' | 'expired' | 'no_watch';
export type SLAStatus = 'ok' | 'warning' | 'breached' | 'met';
export type GmailLabel = 'INBOX' | 'SENT' | 'DRAFTS' | 'STARRED' | 'IMPORTANT' | 'TRASH' | 'SPAM' | string;

export interface GmailAccount {
  id:            string;
  user_id:       string;
  email:         string;
  display_name:  string | null;
  picture_url?:  string | null;
  is_active:     boolean;
  token_expiry:  string | null;
  watch_expiry:  string | null;
  created_at?:   string;
}

export interface GmailTokenInfo {
  account_id:            string;
  email:                 string;
  is_active:             boolean;
  token_status:          GmailTokenStatus;
  token_expiry:          string | null;
  watch_status:          GmailWatchStatus;
  watch_expiry:          string | null;
  minutes_until_expiry:  number | null;
}

export interface GmailThread {
  id:              string;
  account_id:      string;
  gmail_thread_id: string;
  thread_id?:      string;   // Alias legado
  subject:         string | null;
  snippet:         string | null;
  from_email:      string | null;
  from_name:       string | null;
  label_ids:       string[];
  unread_count:    number;
  message_count:   number;
  is_starred:      boolean;
  is_important:    boolean;
  is_unread?:      boolean;  // Legado
  sla_status:      SLAStatus | null;
  assigned_to:     string | null;
  last_message_at: string | null;
  first_reply_at:  string | null;
  created_at:      string;
  contact?:        any;
  tags?:           string[];
}

export type EmailThread = GmailThread;

export interface GmailDraft {
  id:             string;
  account_id:     string;
  gmail_draft_id: string | null;
  thread_id_ref:  string | null;
  to_emails:      string[];
  cc_emails:      string[];
  subject:        string | null;
  body_html:      string | null;
  last_saved_at:  string;
}

export interface GmailSignature {
  id:          string;
  account_id:  string;
  name:        string;
  content:     string;
  is_default:  boolean;
}

export interface UnifiedEmailAccount {
  account_id:      string;
  user_id:         string;
  email:           string;
  display_name:    string;
  provider:        EmailProvider;
  auth_method:     string;
  is_active:       boolean;
  token_expired:   boolean;
  unread_threads:  number;
  sla_breached:    number;
  created_at:      string;
}

export interface GmailLabelInfo {
  id:             string;
  account_id:     string;
  gmail_label_id: string;
  name:           string;
  type:           'system' | 'user';
  color?:         string | null;
  thread_count?:  number;
  unread_count?:  number;
}

export interface GmailDayMetric {
  date:                    string;
  threads_received:        number;
  threads_replied:         number;
  avg_first_reply_minutes: number | null;
  sla_met_count:           number;
  sla_breached_count:      number;
}

export interface GmailMetricsSummary {
  period:              string;
  total_received:      number;
  total_replied:       number;
  reply_rate:          number;
  avg_reply_minutes:   number | null;
  sla_compliance_rate: number;
  total_sla_met:       number;
  total_sla_breached:  number;
  daily:               GmailDayMetric[];
}

export interface GmailSLADashboard {
  ok_count:       number;
  warning_count:  number;
  breached_count: number;
  met_count:      number;
  total:          number;
}

export interface GmailSendParams {
  to:          string | string[];
  cc?:         string | string[];
  bcc?:        string | string[];
  subject:     string;
  bodyHtml:    string;
  threadId?:   string;
  inReplyTo?:  string;
  signature?:  boolean;
}
