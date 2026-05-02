-- ═══════════════════════════════════════════════════════════
-- 04_VIEWS: 6 views Lovable que faltam no VPS
-- ═══════════════════════════════════════════════════════════

--
-- PostgreSQL database dump
--

\restrict AGljCpCxoYGu0zdqcJVOf7SFPETLFPuCmGP3JdKdEQpMxQpNnxZHKZrMbMBeyD6

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

--
-- Name: channel_connections_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.channel_connections_safe WITH (security_invoker='on') AS
 SELECT channel_connections.id,
    channel_connections.channel_type,
    channel_connections.name,
    channel_connections.status,
    channel_connections.is_active,
    channel_connections.external_account_id,
    channel_connections.external_page_id,
    channel_connections.webhook_url,
    channel_connections.whatsapp_connection_id,
    channel_connections.created_at,
    channel_connections.updated_at,
    channel_connections.created_by
   FROM public.channel_connections;


--
-- Name: password_reset_requests_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.password_reset_requests_safe WITH (security_invoker='on') AS
 SELECT password_reset_requests.id,
    password_reset_requests.user_id,
    password_reset_requests.email,
    password_reset_requests.reason,
    password_reset_requests.status,
    password_reset_requests.reviewed_by,
    password_reset_requests.reviewed_at,
    password_reset_requests.rejection_reason,
    password_reset_requests.token_expires_at,
    password_reset_requests.ip_address,
    password_reset_requests.user_agent,
    password_reset_requests.created_at,
    password_reset_requests.updated_at
   FROM public.password_reset_requests;


--
-- Name: profiles_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.profiles_public WITH (security_invoker='true') AS
 SELECT profiles.id,
    profiles.user_id,
    profiles.name,
    profiles.avatar_url,
    profiles.is_active,
    profiles.department,
    profiles.job_title
   FROM public.profiles;


--
-- Name: whatsapp_connections_agent; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.whatsapp_connections_agent WITH (security_invoker='on') AS
 SELECT whatsapp_connections.id,
    whatsapp_connections.name,
    whatsapp_connections.status,
    whatsapp_connections.phone_number,
    whatsapp_connections.is_default
   FROM public.whatsapp_connections;


--
-- Name: whatsapp_connections_public; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.whatsapp_connections_public WITH (security_invoker='true') AS
 SELECT whatsapp_connections.id,
    whatsapp_connections.name,
    whatsapp_connections.status,
    whatsapp_connections.is_default
   FROM public.whatsapp_connections;


--
-- Name: whatsapp_connections_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.whatsapp_connections_safe WITH (security_invoker='true') AS
 SELECT whatsapp_connections.id,
    whatsapp_connections.name,
    whatsapp_connections.phone_number,
    whatsapp_connections.status,
    whatsapp_connections.is_default,
        CASE
            WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN whatsapp_connections.qr_code
            ELSE NULL::text
        END AS qr_code,
        CASE
            WHEN public.has_role(auth.uid(), 'admin'::public.app_role) THEN whatsapp_connections.instance_id
            ELSE NULL::text
        END AS instance_id,
    whatsapp_connections.farewell_message,
    whatsapp_connections.farewell_enabled,
    whatsapp_connections.battery_level,
    whatsapp_connections.is_plugged,
    whatsapp_connections.retry_count,
    whatsapp_connections.max_retries,
    whatsapp_connections.last_health_check,
    whatsapp_connections.health_status,
    whatsapp_connections.health_response_ms,
    whatsapp_connections.created_by,
    whatsapp_connections.created_at,
    whatsapp_connections.updated_at
   FROM public.whatsapp_connections;


--
-- PostgreSQL database dump complete
--

\unrestrict AGljCpCxoYGu0zdqcJVOf7SFPETLFPuCmGP3JdKdEQpMxQpNnxZHKZrMbMBeyD6

