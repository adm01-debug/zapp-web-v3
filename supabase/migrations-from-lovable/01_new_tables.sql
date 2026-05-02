-- ═══════════════════════════════════════════════════════════
-- 01_NEW_TABLES: 35 tables faltantes no VPS
-- Inclui: PKs, FKs, RLS policies, triggers, indexes
-- ═══════════════════════════════════════════════════════════

--
-- PostgreSQL database dump
--

\restrict oTKNL5Wi30DbMmYyBWrOWLyhPbOmzbeRLMLxvt9JpLPPirSLynRwT3u4zR2nIpM

-- Dumped from database version 15.16 (Debian 15.16-0+deb12u1)
-- Dumped by pg_dump version 15.16 (Debian 15.16-0+deb12u1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: sticky_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sticky_assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    channel_connection_id uuid,
    agent_profile_id uuid NOT NULL,
    queue_id uuid,
    last_assigned_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: instance_processing_pauses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instance_processing_pauses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_name text NOT NULL,
    paused_until timestamp with time zone NOT NULL,
    reason text NOT NULL,
    trigger_count integer DEFAULT 0 NOT NULL,
    paused_by uuid,
    auto_paused boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    investigated_at timestamp with time zone,
    investigated_by uuid,
    investigation_notes text
);


--
-- Name: integration_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider text NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    default_instance text,
    display_phone text,
    waba_name text,
    detected_signals jsonb DEFAULT '{}'::jsonb NOT NULL,
    migration_status text DEFAULT 'pending'::text NOT NULL,
    migration_notes text,
    migrated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT integration_profiles_migration_status_check CHECK ((migration_status = ANY (ARRAY['pending'::text, 'migrated'::text, 'pending_credentials'::text, 'noop'::text, 'error'::text]))),
    CONSTRAINT integration_profiles_provider_check CHECK ((provider = ANY (ARRAY['evolution'::text, 'cloud'::text])))
);


--
-- Name: channel_provider_routes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.channel_provider_routes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel_connection_id uuid,
    whatsapp_connection_id uuid,
    primary_provider_id uuid NOT NULL,
    fallback_provider_id uuid,
    current_provider_id uuid,
    switched_at timestamp with time zone,
    switched_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_channel_ref CHECK (((((channel_connection_id IS NOT NULL))::integer + ((whatsapp_connection_id IS NOT NULL))::integer) = 1))
);


--
-- Name: contact_export_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_export_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    exported_by uuid,
    workspace_id uuid NOT NULL,
    exported_at timestamp with time zone DEFAULT now() NOT NULL,
    contact_count integer,
    export_format text DEFAULT 'csv'::text,
    filters_used jsonb
);


--
-- Name: contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    email text,
    avatar_url text,
    assigned_to uuid,
    whatsapp_connection_id uuid,
    tags text[] DEFAULT '{}'::text[],
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nickname text,
    surname text,
    job_title text,
    company text,
    queue_id uuid,
    contact_type text DEFAULT 'cliente'::text,
    ai_priority text DEFAULT 'normal'::text,
    ai_sentiment text DEFAULT 'neutral'::text,
    channel_type text DEFAULT 'whatsapp'::text,
    channel_connection_id uuid,
    group_category text,
    lead_score integer DEFAULT 0,
    risk_score integer DEFAULT 0,
    lead_origin text,
    consent_status text DEFAULT 'unknown'::text,
    phone_numbers jsonb DEFAULT '[]'::jsonb,
    version integer DEFAULT 1 NOT NULL,
    updated_by uuid,
    lgpd_consent_at timestamp with time zone,
    lgpd_consent_channel text,
    lgpd_opt_out_at timestamp with time zone,
    lgpd_marketing_consent boolean DEFAULT false,
    lgpd_data_sharing boolean DEFAULT false,
    lgpd_profiling boolean DEFAULT false,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    deleted_reason text,
    merged_from_id uuid,
    lgpd_last_updated_at timestamp with time zone,
    birth_date date,
    CONSTRAINT chk_birth_date_not_future CHECK (((birth_date IS NULL) OR (birth_date <= CURRENT_DATE))),
    CONSTRAINT chk_contact_email_format CHECK (((email IS NULL) OR (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))),
    CONSTRAINT chk_contact_name_length CHECK (((length(name) >= 1) AND (length(name) <= 500))),
    CONSTRAINT chk_contact_phone_length CHECK (((phone IS NULL) OR ((length(phone) >= 4) AND (length(phone) <= 20)))),
    CONSTRAINT chk_lgpd_marketing_requires_consent CHECK (((NOT lgpd_marketing_consent) OR ((lgpd_consent_at IS NOT NULL) AND (lgpd_opt_out_at IS NULL)))),
    CONSTRAINT chk_lgpd_optout_after_consent CHECK (((lgpd_opt_out_at IS NULL) OR (lgpd_consent_at IS NULL) OR (lgpd_opt_out_at >= lgpd_consent_at))),
    CONSTRAINT chk_phone_numbers_valid CHECK (((phone_numbers IS NULL) OR (phone_numbers = '[]'::jsonb) OR public.validate_phone_numbers(phone_numbers)))
);


--
-- Name: TABLE contacts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.contacts IS 'Contact/conversation records with SLA tracking indexes';


--
-- Name: COLUMN contacts.contact_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contacts.contact_type IS 'Type of contact: cliente, fornecedor, colaborador, prestador_servico';


--
-- Name: COLUMN contacts.phone_numbers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contacts.phone_numbers IS 'JSONB array of phone numbers with type/label/whatsapp flags';


--
-- Name: COLUMN contacts.version; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contacts.version IS 'Optimistic locking version counter';


--
-- Name: COLUMN contacts.lgpd_consent_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contacts.lgpd_consent_at IS 'LGPD: Timestamp when contact gave general consent';


--
-- Name: COLUMN contacts.lgpd_consent_channel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contacts.lgpd_consent_channel IS 'LGPD: Channel through which consent was given';


--
-- Name: COLUMN contacts.lgpd_opt_out_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contacts.lgpd_opt_out_at IS 'LGPD: Timestamp when contact revoked consent';


--
-- Name: COLUMN contacts.lgpd_marketing_consent; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contacts.lgpd_marketing_consent IS 'LGPD: Specific consent for marketing communications';


--
-- Name: COLUMN contacts.lgpd_data_sharing; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contacts.lgpd_data_sharing IS 'LGPD: Specific consent for data sharing with partners';


--
-- Name: COLUMN contacts.lgpd_profiling; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contacts.lgpd_profiling IS 'LGPD: Specific consent for profiling and personalization';


--
-- Name: COLUMN contacts.deleted_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contacts.deleted_at IS 'Soft delete timestamp (NULL = active)';


--
-- Name: COLUMN contacts.deleted_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contacts.deleted_by IS 'User who deleted the contact';


--
-- Name: COLUMN contacts.merged_from_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.contacts.merged_from_id IS 'ID of contact that was merged into this one';


--
-- Name: conversation_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_participants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    participant_type text NOT NULL,
    profile_id uuid,
    external_actor_id text,
    role text DEFAULT 'observer'::text NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    left_at timestamp with time zone,
    reason_left text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conversation_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    external_contact_id uuid NOT NULL,
    external_conversation_id uuid,
    remote_jid text NOT NULL,
    instance_name text DEFAULT 'wpp2'::text NOT NULL,
    channel text DEFAULT 'whatsapp'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    last_event_at timestamp with time zone,
    last_event_type text,
    message_count bigint DEFAULT 0 NOT NULL,
    unread_count integer DEFAULT 0 NOT NULL,
    health_score numeric(4,2),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: crisis_room_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crisis_room_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    severity text DEFAULT 'warning'::text NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric,
    threshold numeric,
    message text NOT NULL,
    is_active boolean DEFAULT true,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: email_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email_message_id uuid NOT NULL,
    gmail_attachment_id text,
    filename text NOT NULL,
    mime_type text,
    size_bytes integer,
    storage_path text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE email_attachments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.email_attachments IS 'Anexos de email Gmail - RLS corrigido em 2026-04-12';


--
-- Name: email_labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_labels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gmail_account_id uuid NOT NULL,
    gmail_label_id text NOT NULL,
    name text NOT NULL,
    label_type text DEFAULT 'user'::text,
    color text,
    message_count integer DEFAULT 0,
    unread_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_labels_label_type_check CHECK ((label_type = ANY (ARRAY['system'::text, 'user'::text])))
);


--
-- Name: email_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid NOT NULL,
    gmail_message_id text NOT NULL,
    gmail_account_id uuid NOT NULL,
    from_address text NOT NULL,
    from_name text,
    to_addresses text[] DEFAULT '{}'::text[],
    cc_addresses text[] DEFAULT '{}'::text[],
    bcc_addresses text[] DEFAULT '{}'::text[],
    reply_to_address text,
    subject text,
    body_text text,
    body_html text,
    snippet text,
    label_ids text[] DEFAULT '{}'::text[],
    is_read boolean DEFAULT false,
    is_starred boolean DEFAULT false,
    has_attachments boolean DEFAULT false,
    in_reply_to text,
    references_header text,
    internal_date timestamp with time zone,
    direction text DEFAULT 'inbound'::text NOT NULL,
    zapp_message_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT email_messages_direction_check CHECK ((direction = ANY (ARRAY['inbound'::text, 'outbound'::text])))
);


--
-- Name: TABLE email_messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.email_messages IS 'Mensagens de email Gmail - RLS corrigido em 2026-04-12';


--
-- Name: evolution_fallback_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.evolution_fallback_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    action text NOT NULL,
    endpoint text NOT NULL,
    instance text,
    status integer NOT NULL,
    reason text NOT NULL,
    mode text DEFAULT 'detected'::text NOT NULL,
    fallback_target text NOT NULL,
    primary_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: file_scan_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_scan_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    file_name text NOT NULL,
    bucket_id text NOT NULL,
    status text NOT NULL,
    provider text NOT NULL,
    provider_response jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: gmail_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gmail_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id_ref uuid NOT NULL,
    account_id uuid NOT NULL,
    attachment_id text NOT NULL,
    filename text NOT NULL,
    mime_type text,
    size_bytes integer,
    storage_url text,
    downloaded boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gmail_health_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gmail_health_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT now(),
    status text NOT NULL,
    operation text,
    resource text,
    request_id text,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_failure boolean DEFAULT false
);


--
-- Name: instance_auth_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.instance_auth_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_name text NOT NULL,
    reason text NOT NULL,
    source text NOT NULL,
    http_status integer,
    detail text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT instance_auth_events_reason_check CHECK ((reason = ANY (ARRAY['invalid_signature'::text, 'auth_401'::text, 'auth_403'::text]))),
    CONSTRAINT instance_auth_events_source_check CHECK ((source = ANY (ARRAY['webhook'::text, 'evolution-api'::text])))
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid,
    whatsapp_connection_id uuid,
    sender text NOT NULL,
    content text NOT NULL,
    message_type text DEFAULT 'text'::text NOT NULL,
    media_url text,
    is_read boolean DEFAULT false,
    agent_id uuid,
    external_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    transcription text,
    transcription_status text DEFAULT 'pending'::text,
    status text DEFAULT 'sent'::text,
    status_updated_at timestamp with time zone DEFAULT now(),
    is_deleted boolean DEFAULT false,
    channel_type text DEFAULT 'whatsapp'::text,
    channel_connection_id uuid,
    email_subject text,
    email_from text,
    email_to text[],
    email_cc text[],
    email_html_body text,
    email_thread_id uuid,
    is_edited boolean DEFAULT false NOT NULL,
    request_id text,
    error_code text,
    error_reason text,
    retry_attempt smallint,
    retry_total smallint,
    CONSTRAINT messages_message_type_check CHECK ((message_type = ANY (ARRAY['text'::text, 'image'::text, 'audio'::text, 'video'::text, 'document'::text, 'sticker'::text, 'location'::text, 'contact'::text, 'poll'::text, 'button'::text, 'list'::text, 'reaction'::text, 'vcard'::text, 'ptt'::text, 'link'::text, 'template'::text, 'interactive'::text, 'order'::text, 'product'::text, 'catalog'::text]))),
    CONSTRAINT messages_sender_check CHECK ((sender = ANY (ARRAY['agent'::text, 'contact'::text])))
);

ALTER TABLE ONLY public.messages REPLICA IDENTITY FULL;


--
-- Name: TABLE messages; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.messages IS 'Chat messages with RLS and performance indexes';


--
-- Name: COLUMN messages.retry_attempt; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.retry_attempt IS 'Última tentativa de envio registrada (1..retry_total). Persistido para sobreviver a reload.';


--
-- Name: COLUMN messages.retry_total; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.messages.retry_total IS 'Total de tentativas configurado para o envio (MAX_RETRIES no messageSender).';


--
-- Name: mfa_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mfa_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    factor_id text NOT NULL,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:05:00'::interval) NOT NULL
);


--
-- Name: nps_invitations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nps_invitations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_id uuid NOT NULL,
    channel text DEFAULT 'whatsapp'::text NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    responded boolean DEFAULT false NOT NULL,
    response_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outbox_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outbox_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aggregate_type text NOT NULL,
    aggregate_id uuid NOT NULL,
    event_type text NOT NULL,
    payload jsonb NOT NULL,
    idempotency_key text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    dispatched_at timestamp with time zone,
    last_error text,
    trace_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pii_access_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pii_access_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    accessed_by uuid,
    contact_id uuid,
    field text NOT NULL,
    accessed_at timestamp with time zone DEFAULT now() NOT NULL,
    source text
);


--
-- Name: provider_session_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_session_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    provider_id uuid NOT NULL,
    level text DEFAULT 'info'::text NOT NULL,
    event text NOT NULL,
    message text,
    latency_ms integer,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT provider_session_logs_level_check CHECK ((level = ANY (ARRAY['info'::text, 'warn'::text, 'error'::text])))
);


--
-- Name: provider_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id uuid NOT NULL,
    channel_connection_id uuid,
    whatsapp_connection_id uuid,
    status text DEFAULT 'connecting'::text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    last_heartbeat_at timestamp with time zone DEFAULT now(),
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT provider_sessions_status_check CHECK ((status = ANY (ARRAY['connecting'::text, 'connected'::text, 'degraded'::text, 'disconnected'::text, 'failed'::text])))
);


--
-- Name: proxy_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxy_alerts (
    id bigint NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    kind text NOT NULL,
    severity text NOT NULL,
    value numeric NOT NULL,
    threshold numeric NOT NULL,
    window_minutes integer NOT NULL,
    sample_size integer NOT NULL,
    details jsonb
);


--
-- Name: proxy_alerts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proxy_alerts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proxy_alerts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proxy_alerts_id_seq OWNED BY public.proxy_alerts.id;


--
-- Name: proxy_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proxy_metrics (
    id bigint NOT NULL,
    ts timestamp with time zone DEFAULT now() NOT NULL,
    cid text,
    rid text,
    op text NOT NULL,
    target text NOT NULL,
    status integer NOT NULL,
    ms integer NOT NULL,
    ok boolean NOT NULL,
    timeout_fired boolean DEFAULT false NOT NULL,
    pg_timeout boolean DEFAULT false NOT NULL,
    err_code text,
    err_msg text
);


--
-- Name: proxy_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.proxy_metrics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proxy_metrics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.proxy_metrics_id_seq OWNED BY public.proxy_metrics.id;


--
-- Name: reprocess_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reprocess_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    idempotency_key text NOT NULL,
    target_kind text NOT NULL,
    target_id uuid NOT NULL,
    action text NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 5 NOT NULL,
    requested_by uuid,
    reason text,
    result jsonb,
    error_message text,
    trace_id text,
    scheduled_at timestamp with time zone DEFAULT now() NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: scheduled_job_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_job_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_name text NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status text,
    rows_affected integer,
    error_msg text,
    CONSTRAINT scheduled_job_log_status_check CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'error'::text])))
);


--
-- Name: user_service_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_service_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    service_type public.service_account_type NOT NULL,
    account_email text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: voice_command_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.voice_command_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    transcript text NOT NULL,
    action text NOT NULL,
    response text,
    data jsonb DEFAULT '{}'::jsonb,
    duration_ms integer,
    success boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: webauthn_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webauthn_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    challenge text NOT NULL,
    type text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:05:00'::interval) NOT NULL,
    CONSTRAINT webauthn_challenges_type_check CHECK ((type = ANY (ARRAY['registration'::text, 'authentication'::text])))
);


--
-- Name: webhook_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_audit_log (
    id bigint NOT NULL,
    request_id uuid NOT NULL,
    instance text,
    event_type text,
    status text NOT NULL,
    duration_ms integer,
    error_message text,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webhook_audit_log_status_check CHECK ((status = ANY (ARRAY['received'::text, 'processed'::text, 'duplicate'::text, 'error'::text, 'rejected'::text])))
);


--
-- Name: webhook_audit_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webhook_audit_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhook_audit_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webhook_audit_log_id_seq OWNED BY public.webhook_audit_log.id;


--
-- Name: webhook_event_dedup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_event_dedup (
    event_key text NOT NULL,
    instance_name text NOT NULL,
    event_type text NOT NULL,
    received_at timestamp with time zone DEFAULT now() NOT NULL,
    payload_hash text
);


--
-- Name: TABLE webhook_event_dedup; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhook_event_dedup IS 'Chave de idempotência para eventos do webhook (Evolution + Cloud API). PK = sha256(instance:msg_id:event_type:ts). TTL 7 dias.';


--
-- Name: webhook_events_processed; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_events_processed (
    event_id text NOT NULL,
    instance text NOT NULL,
    event_type text NOT NULL,
    processed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE webhook_events_processed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhook_events_processed IS 'Deduplication table for incoming Evolution webhook events. Rows older than 30 days can be purged.';


--
-- Name: webhook_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    instance_id text NOT NULL,
    event_type text NOT NULL,
    event_count integer DEFAULT 1 NOT NULL,
    window_start timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: proxy_alerts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_alerts ALTER COLUMN id SET DEFAULT nextval('public.proxy_alerts_id_seq'::regclass);


--
-- Name: proxy_metrics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_metrics ALTER COLUMN id SET DEFAULT nextval('public.proxy_metrics_id_seq'::regclass);


--
-- Name: webhook_audit_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_audit_log ALTER COLUMN id SET DEFAULT nextval('public.webhook_audit_log_id_seq'::regclass);


--
-- Name: channel_provider_routes channel_provider_routes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_provider_routes
    ADD CONSTRAINT channel_provider_routes_pkey PRIMARY KEY (id);


--
-- Name: contact_export_log contact_export_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_export_log
    ADD CONSTRAINT contact_export_log_pkey PRIMARY KEY (id);


--
-- Name: contacts contacts_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_phone_key UNIQUE (phone);


--
-- Name: contacts contacts_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_phone_unique UNIQUE (phone);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: conversation_participants conversation_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_pkey PRIMARY KEY (id);


--
-- Name: conversation_threads conversation_threads_external_contact_id_instance_name_chan_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_threads
    ADD CONSTRAINT conversation_threads_external_contact_id_instance_name_chan_key UNIQUE (external_contact_id, instance_name, channel);


--
-- Name: conversation_threads conversation_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_threads
    ADD CONSTRAINT conversation_threads_pkey PRIMARY KEY (id);


--
-- Name: crisis_room_alerts crisis_room_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crisis_room_alerts
    ADD CONSTRAINT crisis_room_alerts_pkey PRIMARY KEY (id);


--
-- Name: email_attachments email_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_pkey PRIMARY KEY (id);


--
-- Name: email_labels email_labels_gmail_account_id_gmail_label_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_labels
    ADD CONSTRAINT email_labels_gmail_account_id_gmail_label_id_key UNIQUE (gmail_account_id, gmail_label_id);


--
-- Name: email_labels email_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_labels
    ADD CONSTRAINT email_labels_pkey PRIMARY KEY (id);


--
-- Name: email_messages email_messages_gmail_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_gmail_message_id_key UNIQUE (gmail_message_id);


--
-- Name: email_messages email_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_pkey PRIMARY KEY (id);


--
-- Name: evolution_fallback_events evolution_fallback_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.evolution_fallback_events
    ADD CONSTRAINT evolution_fallback_events_pkey PRIMARY KEY (id);


--
-- Name: file_scan_logs file_scan_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_scan_logs
    ADD CONSTRAINT file_scan_logs_pkey PRIMARY KEY (id);


--
-- Name: gmail_attachments gmail_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmail_attachments
    ADD CONSTRAINT gmail_attachments_pkey PRIMARY KEY (id);


--
-- Name: gmail_health_logs gmail_health_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmail_health_logs
    ADD CONSTRAINT gmail_health_logs_pkey PRIMARY KEY (id);


--
-- Name: instance_auth_events instance_auth_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instance_auth_events
    ADD CONSTRAINT instance_auth_events_pkey PRIMARY KEY (id);


--
-- Name: instance_processing_pauses instance_processing_pauses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instance_processing_pauses
    ADD CONSTRAINT instance_processing_pauses_pkey PRIMARY KEY (id);


--
-- Name: integration_profiles integration_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_profiles
    ADD CONSTRAINT integration_profiles_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: mfa_sessions mfa_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mfa_sessions
    ADD CONSTRAINT mfa_sessions_pkey PRIMARY KEY (id);


--
-- Name: nps_invitations nps_invitations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nps_invitations
    ADD CONSTRAINT nps_invitations_pkey PRIMARY KEY (id);


--
-- Name: outbox_events outbox_events_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: outbox_events outbox_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbox_events
    ADD CONSTRAINT outbox_events_pkey PRIMARY KEY (id);


--
-- Name: pii_access_log pii_access_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pii_access_log
    ADD CONSTRAINT pii_access_log_pkey PRIMARY KEY (id);


--
-- Name: provider_session_logs provider_session_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_session_logs
    ADD CONSTRAINT provider_session_logs_pkey PRIMARY KEY (id);


--
-- Name: provider_sessions provider_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_sessions
    ADD CONSTRAINT provider_sessions_pkey PRIMARY KEY (id);


--
-- Name: proxy_alerts proxy_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_alerts
    ADD CONSTRAINT proxy_alerts_pkey PRIMARY KEY (id);


--
-- Name: proxy_metrics proxy_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proxy_metrics
    ADD CONSTRAINT proxy_metrics_pkey PRIMARY KEY (id);


--
-- Name: reprocess_jobs reprocess_jobs_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reprocess_jobs
    ADD CONSTRAINT reprocess_jobs_idempotency_key_key UNIQUE (idempotency_key);


--
-- Name: reprocess_jobs reprocess_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reprocess_jobs
    ADD CONSTRAINT reprocess_jobs_pkey PRIMARY KEY (id);


--
-- Name: scheduled_job_log scheduled_job_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_job_log
    ADD CONSTRAINT scheduled_job_log_pkey PRIMARY KEY (id);


--
-- Name: sticky_assignments sticky_assignments_contact_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sticky_assignments
    ADD CONSTRAINT sticky_assignments_contact_id_key UNIQUE (contact_id);


--
-- Name: sticky_assignments sticky_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sticky_assignments
    ADD CONSTRAINT sticky_assignments_pkey PRIMARY KEY (id);


--
-- Name: user_service_accounts user_service_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_service_accounts
    ADD CONSTRAINT user_service_accounts_pkey PRIMARY KEY (id);


--
-- Name: user_service_accounts user_service_accounts_user_id_service_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_service_accounts
    ADD CONSTRAINT user_service_accounts_user_id_service_type_key UNIQUE (user_id, service_type);


--
-- Name: voice_command_logs voice_command_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_command_logs
    ADD CONSTRAINT voice_command_logs_pkey PRIMARY KEY (id);


--
-- Name: webauthn_challenges webauthn_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webauthn_challenges
    ADD CONSTRAINT webauthn_challenges_pkey PRIMARY KEY (id);


--
-- Name: webhook_audit_log webhook_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_audit_log
    ADD CONSTRAINT webhook_audit_log_pkey PRIMARY KEY (id);


--
-- Name: webhook_event_dedup webhook_event_dedup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_event_dedup
    ADD CONSTRAINT webhook_event_dedup_pkey PRIMARY KEY (event_key);


--
-- Name: webhook_events_processed webhook_events_processed_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_events_processed
    ADD CONSTRAINT webhook_events_processed_pkey PRIMARY KEY (event_id);


--
-- Name: webhook_rate_limits webhook_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_rate_limits
    ADD CONSTRAINT webhook_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: idx_contacts_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_assigned_to ON public.contacts USING btree (assigned_to);


--
-- Name: idx_contacts_company_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_company_trgm ON public.contacts USING gin (company extensions.gin_trgm_ops);


--
-- Name: idx_contacts_contact_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_contact_type ON public.contacts USING btree (contact_type);


--
-- Name: idx_contacts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_created_at ON public.contacts USING btree (created_at DESC);


--
-- Name: idx_contacts_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_deleted ON public.contacts USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);


--
-- Name: idx_contacts_email_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_email_trgm ON public.contacts USING gin (email extensions.gin_trgm_ops);


--
-- Name: idx_contacts_job_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_job_title_trgm ON public.contacts USING gin (job_title extensions.gin_trgm_ops);


--
-- Name: idx_contacts_name_asc; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_name_asc ON public.contacts USING btree (name);


--
-- Name: idx_contacts_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_name_trgm ON public.contacts USING gin (name extensions.gin_trgm_ops);


--
-- Name: idx_contacts_nickname_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_nickname_trgm ON public.contacts USING gin (nickname extensions.gin_trgm_ops);


--
-- Name: idx_contacts_not_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_not_deleted ON public.contacts USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_contacts_phone_numbers; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_phone_numbers ON public.contacts USING gin (phone_numbers);


--
-- Name: idx_contacts_phone_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_phone_trgm ON public.contacts USING gin (phone extensions.gin_trgm_ops);


--
-- Name: idx_contacts_queue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_queue_id ON public.contacts USING btree (queue_id);


--
-- Name: idx_contacts_surname_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_surname_trgm ON public.contacts USING gin (surname extensions.gin_trgm_ops);


--
-- Name: idx_contacts_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contacts_type ON public.contacts USING btree (contact_type);


--
-- Name: idx_email_attachments_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_attachments_message ON public.email_attachments USING btree (email_message_id);


--
-- Name: idx_email_labels_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_labels_account ON public.email_labels USING btree (gmail_account_id);


--
-- Name: idx_email_messages_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_account ON public.email_messages USING btree (gmail_account_id);


--
-- Name: idx_email_messages_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_date ON public.email_messages USING btree (internal_date DESC);


--
-- Name: idx_email_messages_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_from ON public.email_messages USING btree (from_address);


--
-- Name: idx_email_messages_gmail_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_gmail_id ON public.email_messages USING btree (gmail_message_id);


--
-- Name: idx_email_messages_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_messages_thread ON public.email_messages USING btree (thread_id);


--
-- Name: idx_evolution_fallback_events_action_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evolution_fallback_events_action_ts ON public.evolution_fallback_events USING btree (action, ts DESC);


--
-- Name: idx_evolution_fallback_events_instance_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evolution_fallback_events_instance_ts ON public.evolution_fallback_events USING btree (instance, ts DESC);


--
-- Name: idx_evolution_fallback_events_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_evolution_fallback_events_ts ON public.evolution_fallback_events USING btree (ts DESC);


--
-- Name: idx_gmail_attachments_msg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gmail_attachments_msg ON public.gmail_attachments USING btree (message_id_ref);


--
-- Name: idx_gmail_health_logs_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gmail_health_logs_request_id ON public.gmail_health_logs USING btree (request_id);


--
-- Name: idx_gmail_health_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gmail_health_logs_timestamp ON public.gmail_health_logs USING btree ("timestamp" DESC);


--
-- Name: idx_iae_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iae_created_at ON public.instance_auth_events USING btree (created_at DESC);


--
-- Name: idx_iae_instance_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iae_instance_created ON public.instance_auth_events USING btree (instance_name, created_at DESC);


--
-- Name: idx_iae_reason_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_iae_reason_created ON public.instance_auth_events USING btree (reason, created_at DESC);


--
-- Name: idx_ipp_instance_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ipp_instance_active ON public.instance_processing_pauses USING btree (instance_name, paused_until DESC);


--
-- Name: idx_ipp_investigated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ipp_investigated_at ON public.instance_processing_pauses USING btree (investigated_at DESC NULLS LAST);


--
-- Name: idx_ipp_paused_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ipp_paused_until ON public.instance_processing_pauses USING btree (paused_until DESC);


--
-- Name: idx_job_log_name_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_log_name_started ON public.scheduled_job_log USING btree (job_name, started_at DESC);


--
-- Name: idx_messages_contact_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_contact_created ON public.messages USING btree (contact_id, created_at DESC);


--
-- Name: idx_messages_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_contact_id ON public.messages USING btree (contact_id);


--
-- Name: idx_messages_contact_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_contact_timestamp ON public.messages USING btree (contact_id, created_at DESC);


--
-- Name: idx_messages_content_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_content_search ON public.messages USING gin (to_tsvector('portuguese'::regconfig, content));


--
-- Name: idx_messages_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_created_at ON public.messages USING btree (created_at DESC);


--
-- Name: idx_messages_external_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_external_id ON public.messages USING btree (external_id);


--
-- Name: idx_messages_failed_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_failed_status ON public.messages USING btree (status, created_at DESC) WHERE (status = ANY (ARRAY['failed'::text, 'failed_auth'::text, 'failed_retries'::text]));


--
-- Name: idx_messages_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_request_id ON public.messages USING btree (request_id) WHERE (request_id IS NOT NULL);


--
-- Name: idx_mfa_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mfa_sessions_user ON public.mfa_sessions USING btree (user_id);


--
-- Name: idx_nps_invitations_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nps_invitations_contact ON public.nps_invitations USING btree (contact_id, sent_at DESC);


--
-- Name: idx_nps_invitations_responded; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_nps_invitations_responded ON public.nps_invitations USING btree (responded, sent_at DESC);


--
-- Name: idx_outbox_aggregate; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbox_aggregate ON public.outbox_events USING btree (aggregate_type, aggregate_id);


--
-- Name: idx_outbox_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbox_event_type ON public.outbox_events USING btree (event_type, created_at DESC);


--
-- Name: idx_outbox_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbox_pending ON public.outbox_events USING btree (next_attempt_at) WHERE (status = 'pending'::text);


--
-- Name: idx_participants_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_active ON public.conversation_participants USING btree (thread_id) WHERE (left_at IS NULL);


--
-- Name: idx_participants_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_profile ON public.conversation_participants USING btree (profile_id) WHERE (profile_id IS NOT NULL);


--
-- Name: idx_participants_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_participants_thread ON public.conversation_participants USING btree (thread_id, joined_at DESC);


--
-- Name: idx_pii_access_log_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pii_access_log_user ON public.pii_access_log USING btree (accessed_by, accessed_at DESC);


--
-- Name: idx_provider_session_logs_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_session_logs_provider ON public.provider_session_logs USING btree (provider_id, created_at DESC);


--
-- Name: idx_provider_session_logs_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_session_logs_session ON public.provider_session_logs USING btree (session_id, created_at DESC);


--
-- Name: idx_provider_sessions_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_sessions_channel ON public.provider_sessions USING btree (channel_connection_id, started_at DESC);


--
-- Name: idx_provider_sessions_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_sessions_open ON public.provider_sessions USING btree (provider_id, status) WHERE (ended_at IS NULL);


--
-- Name: idx_proxy_alerts_kind_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_alerts_kind_ts ON public.proxy_alerts USING btree (kind, ts DESC);


--
-- Name: idx_proxy_alerts_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_alerts_ts ON public.proxy_alerts USING btree (ts DESC);


--
-- Name: idx_proxy_metrics_status_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_metrics_status_ts ON public.proxy_metrics USING btree (status, ts DESC);


--
-- Name: idx_proxy_metrics_target_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_metrics_target_ts ON public.proxy_metrics USING btree (target, ts DESC);


--
-- Name: idx_proxy_metrics_ts; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proxy_metrics_ts ON public.proxy_metrics USING btree (ts DESC);


--
-- Name: idx_rate_limits_instance_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_instance_window ON public.webhook_rate_limits USING btree (instance_id, window_start DESC);


--
-- Name: idx_rj_requested_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rj_requested_by ON public.reprocess_jobs USING btree (requested_by, created_at DESC);


--
-- Name: idx_rj_status_sched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rj_status_sched ON public.reprocess_jobs USING btree (status, scheduled_at) WHERE (status = ANY (ARRAY['queued'::text, 'running'::text]));


--
-- Name: idx_rj_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rj_target ON public.reprocess_jobs USING btree (target_kind, target_id);


--
-- Name: idx_sticky_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sticky_agent ON public.sticky_assignments USING btree (agent_profile_id);


--
-- Name: idx_sticky_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sticky_contact ON public.sticky_assignments USING btree (contact_id);


--
-- Name: idx_sticky_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sticky_expires ON public.sticky_assignments USING btree (expires_at);


--
-- Name: idx_threads_contact; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_threads_contact ON public.conversation_threads USING btree (external_contact_id);


--
-- Name: idx_threads_instance_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_threads_instance_channel ON public.conversation_threads USING btree (instance_name, channel);


--
-- Name: idx_threads_status_lastev; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_threads_status_lastev ON public.conversation_threads USING btree (status, last_event_at DESC);


--
-- Name: idx_voice_command_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_command_logs_created_at ON public.voice_command_logs USING btree (created_at DESC);


--
-- Name: idx_voice_command_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_command_logs_user_id ON public.voice_command_logs USING btree (user_id);


--
-- Name: idx_webauthn_challenges_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webauthn_challenges_expires ON public.webauthn_challenges USING btree (expires_at);


--
-- Name: idx_webhook_event_dedup_instance; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_event_dedup_instance ON public.webhook_event_dedup USING btree (instance_name, received_at DESC);


--
-- Name: idx_webhook_event_dedup_received_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_event_dedup_received_at ON public.webhook_event_dedup USING btree (received_at);


--
-- Name: integration_profiles_one_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX integration_profiles_one_active ON public.integration_profiles USING btree (is_active) WHERE (is_active = true);


--
-- Name: uniq_route_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_route_channel ON public.channel_provider_routes USING btree (channel_connection_id) WHERE (channel_connection_id IS NOT NULL);


--
-- Name: uniq_route_wpp; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_route_wpp ON public.channel_provider_routes USING btree (whatsapp_connection_id) WHERE (whatsapp_connection_id IS NOT NULL);


--
-- Name: webhook_audit_log_instance_received_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_audit_log_instance_received_idx ON public.webhook_audit_log USING btree (instance, received_at DESC);


--
-- Name: webhook_audit_log_received_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_audit_log_received_at_idx ON public.webhook_audit_log USING btree (received_at DESC);


--
-- Name: webhook_audit_log_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_audit_log_status_idx ON public.webhook_audit_log USING btree (status) WHERE (status = ANY (ARRAY['error'::text, 'rejected'::text]));


--
-- Name: webhook_events_processed_processed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX webhook_events_processed_processed_at_idx ON public.webhook_events_processed USING btree (processed_at DESC);


--
-- Name: channel_provider_routes channel_provider_routes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER channel_provider_routes_updated_at BEFORE UPDATE ON public.channel_provider_routes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contacts on_contact_created_auto_assign; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_contact_created_auto_assign BEFORE INSERT ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.auto_assign_contact();


--
-- Name: contacts on_contact_queue_auto_assign; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_contact_queue_auto_assign BEFORE INSERT ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.auto_assign_to_queue_agent();


--
-- Name: contacts trg_contact_audit; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_contact_audit AFTER INSERT OR DELETE OR UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.fn_contact_audit_trigger();


--
-- Name: contacts trg_contacts_increment_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_contacts_increment_version BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.fn_contacts_increment_version();


--
-- Name: contacts trg_contacts_lgpd_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_contacts_lgpd_timestamp BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.fn_contacts_update_lgpd_timestamp();


--
-- Name: contacts trg_contacts_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_contacts_set_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW WHEN ((NOT (new.updated_at IS DISTINCT FROM old.updated_at))) EXECUTE FUNCTION public.fn_contacts_set_updated_at();


--
-- Name: integration_profiles trg_integration_profiles_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_integration_profiles_updated BEFORE UPDATE ON public.integration_profiles FOR EACH ROW EXECUTE FUNCTION public.tg_integration_profiles_updated();


--
-- Name: instance_processing_pauses trg_ipp_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ipp_updated_at BEFORE UPDATE ON public.instance_processing_pauses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contacts trg_log_assignment_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_assignment_change AFTER UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.log_assignment_change();


--
-- Name: channel_provider_routes trg_log_route_switchover; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_route_switchover BEFORE UPDATE ON public.channel_provider_routes FOR EACH ROW EXECUTE FUNCTION public.fn_log_route_switchover();


--
-- Name: contacts trg_normalize_contact_phone; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_normalize_contact_phone BEFORE INSERT OR UPDATE OF phone ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.normalize_contact_phone();


--
-- Name: outbox_events trg_outbox_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_outbox_updated BEFORE UPDATE ON public.outbox_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reprocess_jobs trg_rj_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_rj_updated BEFORE UPDATE ON public.reprocess_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: messages trg_sicoob_reply; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sicoob_reply AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.notify_sicoob_on_reply();


--
-- Name: contacts trg_sticky_on_contact_assign; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sticky_on_contact_assign AFTER INSERT OR UPDATE OF assigned_to ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.fn_sticky_on_contact_assign();


--
-- Name: conversation_threads trg_threads_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_threads_updated BEFORE UPDATE ON public.conversation_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contacts update_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: messages update_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_service_accounts update_user_service_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_service_accounts_updated_at BEFORE UPDATE ON public.user_service_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: channel_provider_routes channel_provider_routes_channel_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_provider_routes
    ADD CONSTRAINT channel_provider_routes_channel_connection_id_fkey FOREIGN KEY (channel_connection_id) REFERENCES public.channel_connections(id) ON DELETE CASCADE;


--
-- Name: channel_provider_routes channel_provider_routes_current_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_provider_routes
    ADD CONSTRAINT channel_provider_routes_current_provider_id_fkey FOREIGN KEY (current_provider_id) REFERENCES public.provider_configs(id) ON DELETE SET NULL;


--
-- Name: channel_provider_routes channel_provider_routes_fallback_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_provider_routes
    ADD CONSTRAINT channel_provider_routes_fallback_provider_id_fkey FOREIGN KEY (fallback_provider_id) REFERENCES public.provider_configs(id) ON DELETE SET NULL;


--
-- Name: channel_provider_routes channel_provider_routes_primary_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_provider_routes
    ADD CONSTRAINT channel_provider_routes_primary_provider_id_fkey FOREIGN KEY (primary_provider_id) REFERENCES public.provider_configs(id) ON DELETE RESTRICT;


--
-- Name: channel_provider_routes channel_provider_routes_whatsapp_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.channel_provider_routes
    ADD CONSTRAINT channel_provider_routes_whatsapp_connection_id_fkey FOREIGN KEY (whatsapp_connection_id) REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE;


--
-- Name: contact_export_log contact_export_log_exported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_export_log
    ADD CONSTRAINT contact_export_log_exported_by_fkey FOREIGN KEY (exported_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_channel_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_channel_connection_id_fkey FOREIGN KEY (channel_connection_id) REFERENCES public.channel_connections(id);


--
-- Name: contacts contacts_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_merged_from_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_merged_from_id_fkey FOREIGN KEY (merged_from_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.queues(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: contacts contacts_whatsapp_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_whatsapp_connection_id_fkey FOREIGN KEY (whatsapp_connection_id) REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL;


--
-- Name: conversation_participants conversation_participants_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_participants
    ADD CONSTRAINT conversation_participants_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.conversation_threads(id) ON DELETE CASCADE;


--
-- Name: crisis_room_alerts crisis_room_alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crisis_room_alerts
    ADD CONSTRAINT crisis_room_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.profiles(id);


--
-- Name: email_attachments email_attachments_email_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_attachments
    ADD CONSTRAINT email_attachments_email_message_id_fkey FOREIGN KEY (email_message_id) REFERENCES public.email_messages(id) ON DELETE CASCADE;


--
-- Name: email_labels email_labels_gmail_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_labels
    ADD CONSTRAINT email_labels_gmail_account_id_fkey FOREIGN KEY (gmail_account_id) REFERENCES public.gmail_accounts(id) ON DELETE CASCADE;


--
-- Name: email_messages email_messages_gmail_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_gmail_account_id_fkey FOREIGN KEY (gmail_account_id) REFERENCES public.gmail_accounts(id) ON DELETE CASCADE;


--
-- Name: email_messages email_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.email_threads(id) ON DELETE CASCADE;


--
-- Name: email_messages email_messages_zapp_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_messages
    ADD CONSTRAINT email_messages_zapp_message_id_fkey FOREIGN KEY (zapp_message_id) REFERENCES public.messages(id) ON DELETE SET NULL;


--
-- Name: gmail_attachments gmail_attachments_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmail_attachments
    ADD CONSTRAINT gmail_attachments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.gmail_accounts(id) ON DELETE CASCADE;


--
-- Name: gmail_attachments gmail_attachments_message_id_ref_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gmail_attachments
    ADD CONSTRAINT gmail_attachments_message_id_ref_fkey FOREIGN KEY (message_id_ref) REFERENCES public.gmail_messages(id) ON DELETE CASCADE;


--
-- Name: instance_processing_pauses instance_processing_pauses_investigated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instance_processing_pauses
    ADD CONSTRAINT instance_processing_pauses_investigated_by_fkey FOREIGN KEY (investigated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: instance_processing_pauses instance_processing_pauses_paused_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.instance_processing_pauses
    ADD CONSTRAINT instance_processing_pauses_paused_by_fkey FOREIGN KEY (paused_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: messages messages_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: messages messages_channel_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_channel_connection_id_fkey FOREIGN KEY (channel_connection_id) REFERENCES public.channel_connections(id);


--
-- Name: messages messages_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: messages messages_email_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_email_thread_id_fkey FOREIGN KEY (email_thread_id) REFERENCES public.email_threads(id) ON DELETE SET NULL;


--
-- Name: messages messages_whatsapp_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_whatsapp_connection_id_fkey FOREIGN KEY (whatsapp_connection_id) REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL;


--
-- Name: mfa_sessions mfa_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mfa_sessions
    ADD CONSTRAINT mfa_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: nps_invitations nps_invitations_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nps_invitations
    ADD CONSTRAINT nps_invitations_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: nps_invitations nps_invitations_response_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nps_invitations
    ADD CONSTRAINT nps_invitations_response_id_fkey FOREIGN KEY (response_id) REFERENCES public.nps_surveys(id) ON DELETE SET NULL;


--
-- Name: pii_access_log pii_access_log_accessed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pii_access_log
    ADD CONSTRAINT pii_access_log_accessed_by_fkey FOREIGN KEY (accessed_by) REFERENCES auth.users(id);


--
-- Name: provider_session_logs provider_session_logs_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_session_logs
    ADD CONSTRAINT provider_session_logs_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.provider_configs(id) ON DELETE CASCADE;


--
-- Name: provider_session_logs provider_session_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_session_logs
    ADD CONSTRAINT provider_session_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.provider_sessions(id) ON DELETE CASCADE;


--
-- Name: provider_sessions provider_sessions_channel_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_sessions
    ADD CONSTRAINT provider_sessions_channel_connection_id_fkey FOREIGN KEY (channel_connection_id) REFERENCES public.channel_connections(id) ON DELETE SET NULL;


--
-- Name: provider_sessions provider_sessions_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_sessions
    ADD CONSTRAINT provider_sessions_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.provider_configs(id) ON DELETE CASCADE;


--
-- Name: provider_sessions provider_sessions_whatsapp_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_sessions
    ADD CONSTRAINT provider_sessions_whatsapp_connection_id_fkey FOREIGN KEY (whatsapp_connection_id) REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL;


--
-- Name: reprocess_jobs reprocess_jobs_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reprocess_jobs
    ADD CONSTRAINT reprocess_jobs_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);


--
-- Name: sticky_assignments sticky_assignments_agent_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sticky_assignments
    ADD CONSTRAINT sticky_assignments_agent_profile_id_fkey FOREIGN KEY (agent_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sticky_assignments sticky_assignments_channel_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sticky_assignments
    ADD CONSTRAINT sticky_assignments_channel_connection_id_fkey FOREIGN KEY (channel_connection_id) REFERENCES public.channel_connections(id) ON DELETE CASCADE;


--
-- Name: sticky_assignments sticky_assignments_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sticky_assignments
    ADD CONSTRAINT sticky_assignments_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: sticky_assignments sticky_assignments_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sticky_assignments
    ADD CONSTRAINT sticky_assignments_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.queues(id) ON DELETE SET NULL;


--
-- Name: evolution_fallback_events Admin/supervisor can read fallback events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin/supervisor can read fallback events" ON public.evolution_fallback_events FOR SELECT TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: sticky_assignments Admins and supervisors manage sticky; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins and supervisors manage sticky" ON public.sticky_assignments TO authenticated USING (public.is_admin_or_supervisor(auth.uid())) WITH CHECK (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: crisis_room_alerts Admins can delete crisis alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete crisis alerts" ON public.crisis_room_alerts FOR DELETE TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: webhook_rate_limits Admins can delete rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete rate limits" ON public.webhook_rate_limits FOR DELETE TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: nps_invitations Admins can insert NPS invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert NPS invitations" ON public.nps_invitations FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: crisis_room_alerts Admins can insert crisis alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert crisis alerts" ON public.crisis_room_alerts FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: webhook_rate_limits Admins can insert rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert rate limits" ON public.webhook_rate_limits FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: nps_invitations Admins can update NPS invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update NPS invitations" ON public.nps_invitations FOR UPDATE TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: crisis_room_alerts Admins can update crisis alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update crisis alerts" ON public.crisis_room_alerts FOR UPDATE TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: webhook_rate_limits Admins can update rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update rate limits" ON public.webhook_rate_limits FOR UPDATE TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: user_service_accounts Admins can view all service accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all service accounts" ON public.user_service_accounts FOR SELECT TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: proxy_alerts Admins can view proxy alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view proxy alerts" ON public.proxy_alerts FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: proxy_metrics Admins can view proxy metrics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view proxy metrics" ON public.proxy_metrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: webhook_rate_limits Admins can view rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view rate limits" ON public.webhook_rate_limits FOR SELECT TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: provider_session_logs Admins manage provider logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage provider logs" ON public.provider_session_logs TO authenticated USING (public.is_admin_or_supervisor(auth.uid())) WITH CHECK (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: channel_provider_routes Admins manage routes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage routes" ON public.channel_provider_routes TO authenticated USING (public.is_admin_or_supervisor(auth.uid())) WITH CHECK (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: provider_sessions Admins manage sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage sessions" ON public.provider_sessions TO authenticated USING (public.is_admin_or_supervisor(auth.uid())) WITH CHECK (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: webhook_event_dedup Admins read dedup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read dedup" ON public.webhook_event_dedup FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: sticky_assignments Agents can view own sticky; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Agents can view own sticky" ON public.sticky_assignments FOR SELECT TO authenticated USING (((agent_profile_id = ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid())
 LIMIT 1)) OR public.is_admin_or_supervisor(auth.uid())));


--
-- Name: crisis_room_alerts Authenticated can view crisis alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can view crisis alerts" ON public.crisis_room_alerts FOR SELECT TO authenticated USING ((auth.uid() IS NOT NULL));


--
-- Name: provider_session_logs Authenticated read provider logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read provider logs" ON public.provider_session_logs FOR SELECT TO authenticated USING (true);


--
-- Name: channel_provider_routes Authenticated read routes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read routes" ON public.channel_provider_routes FOR SELECT TO authenticated USING (true);


--
-- Name: provider_sessions Authenticated read sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated read sessions" ON public.provider_sessions FOR SELECT TO authenticated USING (true);


--
-- Name: gmail_health_logs Authenticated users can insert gmail health logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert gmail health logs" ON public.gmail_health_logs FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: nps_invitations Authenticated users can view NPS invitations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view NPS invitations" ON public.nps_invitations FOR SELECT TO authenticated USING (true);


--
-- Name: gmail_health_logs Authorized users can read health logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authorized users can read health logs" ON public.gmail_health_logs FOR SELECT TO authenticated USING (public.is_admin_or_supervisor());


--
-- Name: webauthn_challenges Block anon access to webauthn challenges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block anon access to webauthn challenges" ON public.webauthn_challenges TO anon USING (false) WITH CHECK (false);


--
-- Name: user_service_accounts Only admins can delete service accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can delete service accounts" ON public.user_service_accounts FOR DELETE TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: user_service_accounts Only admins can insert service accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can insert service accounts" ON public.user_service_accounts FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: user_service_accounts Only admins can update service accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only admins can update service accounts" ON public.user_service_accounts FOR UPDATE TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: webhook_event_dedup Service writes dedup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service writes dedup" ON public.webhook_event_dedup FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: messages Users can insert messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (((agent_id IS NULL) OR (agent_id IN ( SELECT profiles.id
   FROM public.profiles
  WHERE (profiles.user_id = auth.uid()))) OR public.is_admin_or_supervisor(auth.uid())));


--
-- Name: voice_command_logs Users can insert own voice logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own voice logs" ON public.voice_command_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: mfa_sessions Users can manage own MFA sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own MFA sessions" ON public.mfa_sessions TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: webauthn_challenges Users can manage own challenges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own challenges" ON public.webauthn_challenges TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: email_labels Users can manage their email labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their email labels" ON public.email_labels TO authenticated USING ((gmail_account_id IN ( SELECT gmail_accounts.id
   FROM public.gmail_accounts
  WHERE (gmail_accounts.profile_id IN ( SELECT profiles.id
           FROM public.profiles
          WHERE (profiles.user_id = auth.uid())))))) WITH CHECK ((gmail_account_id IN ( SELECT gmail_accounts.id
   FROM public.gmail_accounts
  WHERE (gmail_accounts.profile_id IN ( SELECT profiles.id
           FROM public.profiles
          WHERE (profiles.user_id = auth.uid()))))));


--
-- Name: voice_command_logs Users can read own voice logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own voice logs" ON public.voice_command_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: messages Users can update messages from their assigned contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update messages from their assigned contacts" ON public.messages FOR UPDATE TO authenticated USING (((contact_id IN ( SELECT c.id
   FROM public.contacts c
  WHERE (c.assigned_to IN ( SELECT public.get_visible_agent_ids(auth.uid()) AS get_visible_agent_ids)))) OR public.is_admin_or_supervisor(auth.uid())));


--
-- Name: messages Users can view messages from their assigned contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view messages from their assigned contacts" ON public.messages FOR SELECT TO authenticated USING (((contact_id IN ( SELECT c.id
   FROM public.contacts c
  WHERE (c.assigned_to IN ( SELECT public.get_visible_agent_ids(auth.uid()) AS get_visible_agent_ids)))) OR public.is_admin_or_supervisor(auth.uid())));


--
-- Name: user_service_accounts Users can view own service accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own service accounts" ON public.user_service_accounts FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: file_scan_logs Users can view scan logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view scan logs" ON public.file_scan_logs FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- Name: email_labels Users can view their email labels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their email labels" ON public.email_labels FOR SELECT TO authenticated USING (((gmail_account_id IN ( SELECT gmail_accounts.id
   FROM public.gmail_accounts
  WHERE (gmail_accounts.profile_id IN ( SELECT profiles.id
           FROM public.profiles
          WHERE (profiles.user_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))));


--
-- Name: integration_profiles admins can manage integration profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admins can manage integration profiles" ON public.integration_profiles TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: messages agents_full_access_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agents_full_access_messages ON public.messages TO authenticated USING (true) WITH CHECK (true);


--
-- Name: webhook_audit_log authenticated can read webhook_audit_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "authenticated can read webhook_audit_log" ON public.webhook_audit_log FOR SELECT TO authenticated USING (true);


--
-- Name: channel_provider_routes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.channel_provider_routes ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_export_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contact_export_log ENABLE ROW LEVEL SECURITY;

--
-- Name: contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: contacts contacts_no_hard_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY contacts_no_hard_delete ON public.contacts FOR DELETE TO authenticated USING (false);


--
-- Name: contacts contacts_service_role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY contacts_service_role ON public.contacts TO service_role USING (true) WITH CHECK (true);


--
-- Name: conversation_participants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_threads ENABLE ROW LEVEL SECURITY;

--
-- Name: crisis_room_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crisis_room_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: email_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: email_attachments email_attachments_manage_via_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY email_attachments_manage_via_messages ON public.email_attachments TO authenticated USING (((email_message_id IN ( SELECT em.id
   FROM public.email_messages em
  WHERE (em.gmail_account_id IN ( SELECT ga.id
           FROM (public.gmail_accounts ga
             JOIN public.profiles p ON ((p.id = ga.profile_id)))
          WHERE (p.user_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text]))))))) WITH CHECK (((email_message_id IN ( SELECT em.id
   FROM public.email_messages em
  WHERE (em.gmail_account_id IN ( SELECT ga.id
           FROM (public.gmail_accounts ga
             JOIN public.profiles p ON ((p.id = ga.profile_id)))
          WHERE (p.user_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))));


--
-- Name: email_attachments email_attachments_select_via_messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY email_attachments_select_via_messages ON public.email_attachments FOR SELECT TO authenticated USING (((email_message_id IN ( SELECT em.id
   FROM public.email_messages em
  WHERE (em.gmail_account_id IN ( SELECT ga.id
           FROM (public.gmail_accounts ga
             JOIN public.profiles p ON ((p.id = ga.profile_id)))
          WHERE (p.user_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))));


--
-- Name: email_labels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_labels ENABLE ROW LEVEL SECURITY;

--
-- Name: email_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: email_messages email_messages_manage_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY email_messages_manage_own ON public.email_messages TO authenticated USING (((gmail_account_id IN ( SELECT ga.id
   FROM (public.gmail_accounts ga
     JOIN public.profiles p ON ((p.id = ga.profile_id)))
  WHERE (p.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text]))))))) WITH CHECK (((gmail_account_id IN ( SELECT ga.id
   FROM (public.gmail_accounts ga
     JOIN public.profiles p ON ((p.id = ga.profile_id)))
  WHERE (p.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))));


--
-- Name: email_messages email_messages_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY email_messages_select_own ON public.email_messages FOR SELECT TO authenticated USING (((gmail_account_id IN ( SELECT ga.id
   FROM (public.gmail_accounts ga
     JOIN public.profiles p ON ((p.id = ga.profile_id)))
  WHERE (p.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text])))))));


--
-- Name: evolution_fallback_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.evolution_fallback_events ENABLE ROW LEVEL SECURITY;

--
-- Name: contact_export_log export_log_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY export_log_insert ON public.contact_export_log FOR INSERT TO authenticated WITH CHECK ((exported_by = auth.uid()));


--
-- Name: contact_export_log export_log_managers_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY export_log_managers_read ON public.contact_export_log FOR SELECT TO authenticated USING (((workspace_id = ( SELECT contact_export_log.workspace_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text, 'manager'::text])))))));


--
-- Name: file_scan_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.file_scan_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: gmail_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gmail_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: gmail_health_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gmail_health_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: instance_auth_events iae_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY iae_admin_select ON public.instance_auth_events FOR SELECT TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: instance_auth_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.instance_auth_events ENABLE ROW LEVEL SECURITY;

--
-- Name: instance_processing_pauses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.instance_processing_pauses ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: instance_processing_pauses ipp_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ipp_admin_delete ON public.instance_processing_pauses FOR DELETE TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: instance_processing_pauses ipp_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ipp_admin_insert ON public.instance_processing_pauses FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: instance_processing_pauses ipp_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ipp_admin_select ON public.instance_processing_pauses FOR SELECT TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: instance_processing_pauses ipp_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ipp_admin_update ON public.instance_processing_pauses FOR UPDATE TO authenticated USING (public.is_admin_or_supervisor(auth.uid())) WITH CHECK (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: messages messages_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY messages_select_policy ON public.messages FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.contacts c
  WHERE ((c.id = messages.contact_id) AND (public.is_admin_or_supervisor(auth.uid()) OR (c.assigned_to = public.get_profile_id_for_user(auth.uid())) OR (c.assigned_to IS NULL))))));


--
-- Name: mfa_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mfa_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: nps_invitations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.nps_invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: outbox_events outbox_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY outbox_admin_write ON public.outbox_events TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: outbox_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.outbox_events ENABLE ROW LEVEL SECURITY;

--
-- Name: outbox_events outbox_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY outbox_select_admin ON public.outbox_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: conversation_participants participants_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participants_admin_write ON public.conversation_participants TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: conversation_participants participants_select_admin_supervisor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participants_select_admin_supervisor ON public.conversation_participants FOR SELECT TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: conversation_participants participants_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY participants_select_self ON public.conversation_participants FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = conversation_participants.profile_id) AND (p.user_id = auth.uid())))));


--
-- Name: pii_access_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pii_access_log ENABLE ROW LEVEL SECURITY;

--
-- Name: pii_access_log pii_access_log_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pii_access_log_insert ON public.pii_access_log FOR INSERT TO authenticated WITH CHECK ((accessed_by = auth.uid()));


--
-- Name: pii_access_log pii_access_log_select_managers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pii_access_log_select_managers ON public.pii_access_log FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'supervisor'::text]))))));


--
-- Name: provider_session_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.provider_session_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: provider_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.provider_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: proxy_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proxy_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: proxy_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.proxy_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: reprocess_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reprocess_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: reprocess_jobs rj_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rj_admin_write ON public.reprocess_jobs TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: reprocess_jobs rj_select_admin_supervisor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rj_select_admin_supervisor ON public.reprocess_jobs FOR SELECT TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: webhook_audit_log service role manages webhook_audit_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service role manages webhook_audit_log" ON public.webhook_audit_log TO service_role USING (true) WITH CHECK (true);


--
-- Name: webhook_events_processed service role manages webhook_events_processed; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service role manages webhook_events_processed" ON public.webhook_events_processed TO service_role USING (true) WITH CHECK (true);


--
-- Name: sticky_assignments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sticky_assignments ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_profiles supervisors can view integration profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "supervisors can view integration profiles" ON public.integration_profiles FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: conversation_threads threads_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY threads_admin_write ON public.conversation_threads TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: conversation_threads threads_select_admin_supervisor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY threads_select_admin_supervisor ON public.conversation_threads FOR SELECT TO authenticated USING (public.is_admin_or_supervisor(auth.uid()));


--
-- Name: conversation_threads threads_select_participant; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY threads_select_participant ON public.conversation_threads FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (public.conversation_participants cp
     JOIN public.profiles p ON ((p.id = cp.profile_id)))
  WHERE ((cp.thread_id = conversation_threads.id) AND (p.user_id = auth.uid())))));


--
-- Name: user_service_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_service_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_command_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voice_command_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: webauthn_challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_event_dedup; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_event_dedup ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_events_processed; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_events_processed ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict oTKNL5Wi30DbMmYyBWrOWLyhPbOmzbeRLMLxvt9JpLPPirSLynRwT3u4zR2nIpM

