-- ═══════════════════════════════════════════════════════════
-- 02_ALTER_TABLES: 263 colunas Lovable a adicionar em 44 tables existentes
-- ═══════════════════════════════════════════════════════════

-- ─── agent_skills (2 colunas) ───
ALTER TABLE public.agent_skills ADD COLUMN IF NOT EXISTS profile_id uuid NOT NULL;
ALTER TABLE public.agent_skills ADD COLUMN IF NOT EXISTS skill_level integer DEFAULT 1;

-- ─── app_settings (3 colunas) ───
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS key text NOT NULL;
ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS value jsonb DEFAULT '{}'::jsonb;

-- ─── automation_executions (15 colunas) ───
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS acted_at timestamptz;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS acted_by uuid;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS applied_tags text[];
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS assigned_to uuid;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS channel_id uuid;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS department_id uuid;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS error_at timestamptz;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS instance_name text DEFAULT 'wpp2'::text NOT NULL;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS kb_sources text[] DEFAULT '{}'::text[];
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS reassigned_to uuid;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS recommended_tag text;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS remote_jid text NOT NULL;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS rule_snapshot jsonb;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS suggestion_text text;
ALTER TABLE public.automation_executions ADD COLUMN IF NOT EXISTS trigger_payload jsonb DEFAULT '{}'::jsonb NOT NULL;

-- ─── automation_rules (3 colunas) ───
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS channel_id uuid;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS cooldown_seconds integer DEFAULT 300 NOT NULL;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS department_id uuid;

-- ─── avatars (4 colunas) ───
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false;
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS url text NOT NULL;
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS user_id uuid;

-- ─── channel_queues (4 colunas) ───
ALTER TABLE public.channel_queues ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.channel_queues ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;
ALTER TABLE public.channel_queues ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0 NOT NULL;
ALTER TABLE public.channel_queues ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- ─── connection_alert_preferences (4 colunas) ───
ALTER TABLE public.connection_alert_preferences ADD COLUMN IF NOT EXISTS alert_on_degraded boolean DEFAULT true NOT NULL;
ALTER TABLE public.connection_alert_preferences ADD COLUMN IF NOT EXISTS alert_on_disconnected boolean DEFAULT true NOT NULL;
ALTER TABLE public.connection_alert_preferences ADD COLUMN IF NOT EXISTS email_enabled boolean DEFAULT false NOT NULL;
ALTER TABLE public.connection_alert_preferences ADD COLUMN IF NOT EXISTS push_enabled boolean DEFAULT true NOT NULL;

-- ─── contact_audit_log (10 colunas) ───
ALTER TABLE public.contact_audit_log ADD COLUMN IF NOT EXISTS action text NOT NULL;
ALTER TABLE public.contact_audit_log ADD COLUMN IF NOT EXISTS changed_at timestamptz DEFAULT now() NOT NULL;
ALTER TABLE public.contact_audit_log ADD COLUMN IF NOT EXISTS changed_by uuid;
ALTER TABLE public.contact_audit_log ADD COLUMN IF NOT EXISTS contact_id uuid NOT NULL;
ALTER TABLE public.contact_audit_log ADD COLUMN IF NOT EXISTS ip_address inet;
ALTER TABLE public.contact_audit_log ADD COLUMN IF NOT EXISTS new_values jsonb;
ALTER TABLE public.contact_audit_log ADD COLUMN IF NOT EXISTS old_values jsonb;
ALTER TABLE public.contact_audit_log ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.contact_audit_log ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.contact_audit_log ADD COLUMN IF NOT EXISTS user_agent text;

-- ─── conversation_summaries (3 colunas) ───
ALTER TABLE public.conversation_summaries ADD COLUMN IF NOT EXISTS conversation_id uuid;
ALTER TABLE public.conversation_summaries ADD COLUMN IF NOT EXISTS generated_by text DEFAULT 'ai'::text;
ALTER TABLE public.conversation_summaries ADD COLUMN IF NOT EXISTS summary text;

-- ─── conversation_transfers (4 colunas) ───
ALTER TABLE public.conversation_transfers ADD COLUMN IF NOT EXISTS conversation_id uuid;
ALTER TABLE public.conversation_transfers ADD COLUMN IF NOT EXISTS from_agent_id uuid;
ALTER TABLE public.conversation_transfers ADD COLUMN IF NOT EXISTS reason text;
ALTER TABLE public.conversation_transfers ADD COLUMN IF NOT EXISTS to_agent_id uuid;

-- ─── dispatch_error_logs (7 colunas) ───
ALTER TABLE public.dispatch_error_logs ADD COLUMN IF NOT EXISTS agent_email text;
ALTER TABLE public.dispatch_error_logs ADD COLUMN IF NOT EXISTS agent_user_id uuid;
ALTER TABLE public.dispatch_error_logs ADD COLUMN IF NOT EXISTS channel_type text;
ALTER TABLE public.dispatch_error_logs ADD COLUMN IF NOT EXISTS context jsonb;
ALTER TABLE public.dispatch_error_logs ADD COLUMN IF NOT EXISTS failed_message_id uuid;
ALTER TABLE public.dispatch_error_logs ADD COLUMN IF NOT EXISTS occurred_at timestamptz DEFAULT now() NOT NULL;
ALTER TABLE public.dispatch_error_logs ADD COLUMN IF NOT EXISTS remote_jid text;

-- ─── email_templates (5 colunas) ───
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS name text NOT NULL;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS subject text;

-- ─── entity_versions (1 colunas) ───
ALTER TABLE public.entity_versions ADD COLUMN IF NOT EXISTS changed_at timestamptz DEFAULT now() NOT NULL;

-- ─── gmail_accounts (4 colunas) ───
ALTER TABLE public.gmail_accounts ADD COLUMN IF NOT EXISTS history_id text;
ALTER TABLE public.gmail_accounts ADD COLUMN IF NOT EXISTS profile_id uuid NOT NULL;
ALTER TABLE public.gmail_accounts ADD COLUMN IF NOT EXISTS scopes text[] DEFAULT '{}'::text[];
ALTER TABLE public.gmail_accounts ADD COLUMN IF NOT EXISTS watch_expiration timestamptz;

-- ─── gmail_daily_metrics (8 colunas) ───
ALTER TABLE public.gmail_daily_metrics ADD COLUMN IF NOT EXISTS account_id uuid NOT NULL;
ALTER TABLE public.gmail_daily_metrics ADD COLUMN IF NOT EXISTS avg_frt_minutes numeric;
ALTER TABLE public.gmail_daily_metrics ADD COLUMN IF NOT EXISTS date date NOT NULL;
ALTER TABLE public.gmail_daily_metrics ADD COLUMN IF NOT EXISTS received integer DEFAULT 0 NOT NULL;
ALTER TABLE public.gmail_daily_metrics ADD COLUMN IF NOT EXISTS sent integer DEFAULT 0 NOT NULL;
ALTER TABLE public.gmail_daily_metrics ADD COLUMN IF NOT EXISTS sla_breached integer DEFAULT 0 NOT NULL;
ALTER TABLE public.gmail_daily_metrics ADD COLUMN IF NOT EXISTS sla_ok integer DEFAULT 0 NOT NULL;
ALTER TABLE public.gmail_daily_metrics ADD COLUMN IF NOT EXISTS sla_warning integer DEFAULT 0 NOT NULL;

-- ─── gmail_drafts (9 colunas) ───
ALTER TABLE public.gmail_drafts ADD COLUMN IF NOT EXISTS account_id uuid NOT NULL;
ALTER TABLE public.gmail_drafts ADD COLUMN IF NOT EXISTS bcc_emails text[];
ALTER TABLE public.gmail_drafts ADD COLUMN IF NOT EXISTS body_html text;
ALTER TABLE public.gmail_drafts ADD COLUMN IF NOT EXISTS cc_emails text[];
ALTER TABLE public.gmail_drafts ADD COLUMN IF NOT EXISTS gmail_draft_id text;
ALTER TABLE public.gmail_drafts ADD COLUMN IF NOT EXISTS last_saved_at timestamptz DEFAULT now() NOT NULL;
ALTER TABLE public.gmail_drafts ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.gmail_drafts ADD COLUMN IF NOT EXISTS thread_id_ref uuid;
ALTER TABLE public.gmail_drafts ADD COLUMN IF NOT EXISTS to_emails text[];

-- ─── gmail_health_summary (3 colunas) ───
ALTER TABLE public.gmail_health_summary ADD COLUMN IF NOT EXISTS failure_count_60m integer DEFAULT 0;
ALTER TABLE public.gmail_health_summary ADD COLUMN IF NOT EXISTS last_validation timestamptz DEFAULT now();
ALTER TABLE public.gmail_health_summary ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ─── gmail_labels (8 colunas) ───
ALTER TABLE public.gmail_labels ADD COLUMN IF NOT EXISTS account_id uuid NOT NULL;
ALTER TABLE public.gmail_labels ADD COLUMN IF NOT EXISTS color_bg text;
ALTER TABLE public.gmail_labels ADD COLUMN IF NOT EXISTS color_fg text;
ALTER TABLE public.gmail_labels ADD COLUMN IF NOT EXISTS label_id text NOT NULL;
ALTER TABLE public.gmail_labels ADD COLUMN IF NOT EXISTS messages_total integer DEFAULT 0;
ALTER TABLE public.gmail_labels ADD COLUMN IF NOT EXISTS messages_unread integer DEFAULT 0;
ALTER TABLE public.gmail_labels ADD COLUMN IF NOT EXISTS name text NOT NULL;
ALTER TABLE public.gmail_labels ADD COLUMN IF NOT EXISTS type text;

-- ─── gmail_messages (18 colunas) ───
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS account_id uuid NOT NULL;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS bcc_emails text[];
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS body_html text;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS body_plain text;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS cc_emails text[];
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS from_email text;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS from_name text;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS has_attachments boolean DEFAULT false NOT NULL;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS internal_date timestamptz;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false NOT NULL;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false NOT NULL;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS is_sent boolean DEFAULT false NOT NULL;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS label_ids text[];
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS message_id text NOT NULL;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS snippet text;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS thread_id_ref uuid NOT NULL;
ALTER TABLE public.gmail_messages ADD COLUMN IF NOT EXISTS to_emails text[];

-- ─── gmail_revalidation_jobs (3 colunas) ───
ALTER TABLE public.gmail_revalidation_jobs ADD COLUMN IF NOT EXISTS requested_at timestamptz DEFAULT now();
ALTER TABLE public.gmail_revalidation_jobs ADD COLUMN IF NOT EXISTS requested_by uuid;
ALTER TABLE public.gmail_revalidation_jobs ADD COLUMN IF NOT EXISTS result jsonb;

-- ─── gmail_signatures (4 colunas) ───
ALTER TABLE public.gmail_signatures ADD COLUMN IF NOT EXISTS account_id uuid NOT NULL;
ALTER TABLE public.gmail_signatures ADD COLUMN IF NOT EXISTS html_content text DEFAULT ''::text NOT NULL;
ALTER TABLE public.gmail_signatures ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false NOT NULL;
ALTER TABLE public.gmail_signatures ADD COLUMN IF NOT EXISTS name text DEFAULT 'Padrão'::text NOT NULL;

-- ─── gmail_threads (17 colunas) ───
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS account_id uuid NOT NULL;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS assigned_agent_id uuid;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS first_reply_at timestamptz;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS frt_minutes integer;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS is_important boolean DEFAULT false NOT NULL;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS is_starred boolean DEFAULT false NOT NULL;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS label_ids text[];
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS last_message_at timestamptz;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS message_count integer DEFAULT 0 NOT NULL;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS participant_emails text[];
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal'::text;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS sla_status text DEFAULT 'ok'::text;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS snippet text;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS subject text;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS tags text[];
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS thread_id text NOT NULL;
ALTER TABLE public.gmail_threads ADD COLUMN IF NOT EXISTS unread_count integer DEFAULT 0 NOT NULL;

-- ─── imap_smtp_accounts (10 colunas) ───
ALTER TABLE public.imap_smtp_accounts ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.imap_smtp_accounts ADD COLUMN IF NOT EXISTS email text NOT NULL;
ALTER TABLE public.imap_smtp_accounts ADD COLUMN IF NOT EXISTS imap_host text;
ALTER TABLE public.imap_smtp_accounts ADD COLUMN IF NOT EXISTS imap_port bigint DEFAULT 993;
ALTER TABLE public.imap_smtp_accounts ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.imap_smtp_accounts ADD COLUMN IF NOT EXISTS password_encrypted text;
ALTER TABLE public.imap_smtp_accounts ADD COLUMN IF NOT EXISTS smtp_host text;
ALTER TABLE public.imap_smtp_accounts ADD COLUMN IF NOT EXISTS smtp_port bigint DEFAULT 587;
ALTER TABLE public.imap_smtp_accounts ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.imap_smtp_accounts ADD COLUMN IF NOT EXISTS username text;

-- ─── login_attempts (4 colunas) ───
ALTER TABLE public.login_attempts ADD COLUMN IF NOT EXISTS attempt_count integer DEFAULT 1 NOT NULL;
ALTER TABLE public.login_attempts ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz DEFAULT now() NOT NULL;
ALTER TABLE public.login_attempts ADD COLUMN IF NOT EXISTS locked_until timestamptz;
ALTER TABLE public.login_attempts ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- ─── notifications (2 colunas) ───
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message text NOT NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at timestamptz;

-- ─── profiles (11 colunas) ───
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'basic'::text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday date;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_download boolean DEFAULT false NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department_id uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nickname text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS session_invalidated_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature text;

-- ─── provider_message_log (14 colunas) ───
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'received'::text NOT NULL;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS error_code text;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS external_contact_id uuid;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS external_message_id text;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS idempotency_key text NOT NULL;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS payload_hash text NOT NULL;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS persisted_at timestamptz;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS received_at timestamptz DEFAULT now() NOT NULL;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS routed_at timestamptz;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS thread_id uuid;
ALTER TABLE public.provider_message_log ADD COLUMN IF NOT EXISTS trace_id text;

-- ─── query_telemetry (10 colunas) ───
ALTER TABLE public.query_telemetry ADD COLUMN IF NOT EXISTS count_mode text;
ALTER TABLE public.query_telemetry ADD COLUMN IF NOT EXISTS duration_ms integer DEFAULT 0 NOT NULL;
ALTER TABLE public.query_telemetry ADD COLUMN IF NOT EXISTS error_message text;
ALTER TABLE public.query_telemetry ADD COLUMN IF NOT EXISTS operation text DEFAULT 'select'::text NOT NULL;
ALTER TABLE public.query_telemetry ADD COLUMN IF NOT EXISTS query_limit integer;
ALTER TABLE public.query_telemetry ADD COLUMN IF NOT EXISTS query_offset integer;
ALTER TABLE public.query_telemetry ADD COLUMN IF NOT EXISTS record_count integer;
ALTER TABLE public.query_telemetry ADD COLUMN IF NOT EXISTS rpc_name text;
ALTER TABLE public.query_telemetry ADD COLUMN IF NOT EXISTS severity text DEFAULT 'normal'::text NOT NULL;
ALTER TABLE public.query_telemetry ADD COLUMN IF NOT EXISTS table_name text;

-- ─── queues (17 colunas) ───
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS auto_rebalance_enabled boolean DEFAULT true NOT NULL;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS department_id uuid;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS distribution_algorithm text DEFAULT 'least_busy'::text NOT NULL;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS last_assigned_at timestamptz;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS last_assigned_user_id uuid;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS max_concurrent_per_agent integer;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS max_per_queue_per_agent integer;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS max_queue_size integer;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS max_wait_seconds integer;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS max_wait_time_minutes integer DEFAULT 30;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS overflow_queue_id uuid;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS paused_at timestamptz;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS paused_by uuid;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS paused_reason text;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS routing_weight integer DEFAULT 1 NOT NULL;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS sla_priority text DEFAULT 'medium'::text NOT NULL;
ALTER TABLE public.queues ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text NOT NULL;

-- ─── rate_limit_logs (4 colunas) ───
ALTER TABLE public.rate_limit_logs ADD COLUMN IF NOT EXISTS blocked boolean DEFAULT false;
ALTER TABLE public.rate_limit_logs ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.rate_limit_logs ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.rate_limit_logs ADD COLUMN IF NOT EXISTS user_id uuid;

-- ─── role_permissions (1 colunas) ───
ALTER TABLE public.role_permissions ADD COLUMN IF NOT EXISTS role app_role NOT NULL;

-- ─── salespeople (7 colunas) ───
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS name text NOT NULL;
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS quota numeric DEFAULT 0;
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS team text;
ALTER TABLE public.salespeople ADD COLUMN IF NOT EXISTS user_id uuid;

-- ─── service_channels (17 colunas) ───
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS color text DEFAULT '#3B82F6'::text NOT NULL;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS default_queue_id uuid;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS disabled_at timestamptz;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS disabled_reason text;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false NOT NULL;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS paused_at timestamptz;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS paused_reason text;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS routing_mode text DEFAULT 'manual'::text NOT NULL;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text NOT NULL;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS sticky_enabled boolean DEFAULT false NOT NULL;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS sticky_ttl_hours integer DEFAULT 24 NOT NULL;
ALTER TABLE public.service_channels ADD COLUMN IF NOT EXISTS whatsapp_connection_id uuid;

-- ─── stickers (1 colunas) ───
ALTER TABLE public.stickers ADD COLUMN IF NOT EXISTS uploaded_by text;

-- ─── system_settings (3 colunas) ───
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS key text NOT NULL;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS value jsonb DEFAULT '{}'::jsonb NOT NULL;

-- ─── tags (5 colunas) ───
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS color text DEFAULT '#3b82f6'::text NOT NULL;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS name text NOT NULL;
ALTER TABLE public.tags ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL;

-- ─── user_roles (1 colunas) ───
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS role app_role DEFAULT 'agent'::app_role NOT NULL;

-- ─── whatsapp_cloud_webhook_pings (2 colunas) ───
ALTER TABLE public.whatsapp_cloud_webhook_pings ADD COLUMN IF NOT EXISTS kind text NOT NULL;
ALTER TABLE public.whatsapp_cloud_webhook_pings ADD COLUMN IF NOT EXISTS meta jsonb DEFAULT '{}'::jsonb NOT NULL;

-- ─── whatsapp_connections (15 colunas) ───
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS api_type text DEFAULT 'evolution'::text NOT NULL;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS battery_level integer;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS degraded_at timestamptz;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS farewell_enabled boolean DEFAULT false;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS farewell_message text;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS health_reason text;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS health_response_ms integer;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS health_status text DEFAULT 'unknown'::text;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS is_plugged boolean;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS last_health_check timestamptz;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 5;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS owner_jid text;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;
ALTER TABLE public.whatsapp_connections ADD COLUMN IF NOT EXISTS routing_mode text DEFAULT 'manual'::text NOT NULL;
