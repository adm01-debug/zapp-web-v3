
import { 
  GmailAccount, 
  GmailTokenInfo, 
  GmailThread, 
  GmailDayMetric, 
  GmailLabelInfo,
  UnifiedEmailAccount,
  SLAStatus
} from '@/types/gmail';

/**
 * Mapeia dados brutos do Supabase/RPC para interfaces tipadas do Gmail.
 * Elimina a necessidade de casts 'as any' ou transformações repetitivas nos hooks.
 */
export const gmailMappers = {
  /**
   * Mapeia uma linha da tabela 'gmail_accounts'
   */
  account: (data: any): GmailAccount => ({
    id:            data.id,
    user_id:       data.user_id,
    email:         data.email,
    display_name:  data.display_name,
    is_active:     data.is_active ?? true,
    token_expiry:  data.token_expiry,
    watch_expiry:  data.watch_expiry,
    created_at:    data.created_at,
  }),

  /**
   * Mapeia o retorno do RPC 'rpc_gmail_token_status'
   */
  tokenInfo: (data: any): GmailTokenInfo => ({
    account_id:            data.account_id,
    email:                 data.email,
    is_active:             data.is_active ?? true,
    token_status:          data.token_status || 'no_token',
    token_expiry:          data.token_expiry,
    watch_status:          data.watch_status || 'no_watch',
    watch_expiry:          data.watch_expiry,
    minutes_until_expiry:  data.minutes_until_expiry,
  }),

  /**
   * Mapeia uma linha da tabela 'gmail_threads' ou retorno de rpc_gmail_search_threads
   */
  thread: (data: any): GmailThread => ({
    id:              data.id,
    account_id:      data.account_id,
    gmail_thread_id: data.gmail_thread_id || data.thread_id,
    thread_id:       data.gmail_thread_id || data.thread_id, // Alias legado
    subject:         data.subject,
    snippet:         data.snippet,
    from_email:      data.from_email,
    from_name:       data.from_name,
    label_ids:       data.label_ids || [],
    unread_count:    data.unread_count || 0,
    message_count:   data.message_count || 0,
    is_starred:      data.is_starred ?? false,
    is_important:    data.is_important ?? false,
    is_unread:       (data.unread_count || 0) > 0, // Calculado
    sla_status:      data.sla_status as SLAStatus | null,
    assigned_to:     data.assigned_to,
    last_message_at: data.last_message_at,
    first_reply_at:  data.first_reply_at,
    created_at:      data.created_at,
    contact:         data.contact,
    tags:            data.tags || [],
  }),

  /**
   * Mapeia uma linha da tabela 'gmail_daily_metrics'
   */
  metric: (data: any): GmailDayMetric => ({
    date:                    data.date,
    threads_received:        data.threads_received || 0,
    threads_replied:         data.threads_replied || 0,
    avg_first_reply_minutes: data.avg_first_reply_minutes,
    sla_met_count:           data.sla_met_count || 0,
    sla_breached_count:      data.sla_breached_count || 0,
  }),

  /**
   * Mapeia uma linha da tabela 'gmail_labels'
   */
  label: (data: any): GmailLabelInfo => ({
    id:             data.id,
    account_id:     data.account_id,
    gmail_label_id: data.gmail_label_id,
    name:           data.name,
    type:           data.type || 'user',
    color:          data.color,
    thread_count:   data.thread_count,
    unread_count:   data.unread_count,
  }),

  /**
   * Mapeia uma linha da view 'v_email_accounts_unified'
   */
  unifiedAccount: (data: any): UnifiedEmailAccount => ({
    account_id:      data.account_id,
    user_id:         data.user_id,
    email:           data.email,
    display_name:    data.display_name || '',
    provider:        data.provider || 'custom',
    auth_method:     data.auth_method || 'password',
    is_active:       data.is_active ?? true,
    token_expired:   data.token_expired ?? false,
    unread_threads:  data.unread_threads || 0,
    sla_breached:    data.sla_breached || 0,
    created_at:      data.created_at,
  }),

  /**
   * Helpers para arrays
   */
  accounts: (data: any[]): GmailAccount[] => (data || []).map(gmailMappers.account),
  tokenInfos: (data: any[]): GmailTokenInfo[] => (data || []).map(gmailMappers.tokenInfo),
  threads: (data: any[]): GmailThread[] => (data || []).map(gmailMappers.thread),
  metrics: (data: any[]): GmailDayMetric[] => (data || []).map(gmailMappers.metric),
  labels: (data: any[]): GmailLabelInfo[] => (data || []).map(gmailMappers.label),
  unifiedAccounts: (data: any[]): UnifiedEmailAccount[] => (data || []).map(gmailMappers.unifiedAccount),
};
