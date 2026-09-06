-- E063: Canal de notificação humana confiável via email (independente de wpp2)
-- Cria fn_dispatch_critical_alert_emails() + fn_send_alert_heartbeat()
-- Chamadas via pg_cron: alertas a cada 5min, heartbeat semanal.
-- Edge function: alert-email-notify (supabase/functions/alert-email-notify/index.ts)
-- Auth: service_role key via vault.decrypted_secrets + pg_net.http_post
-- Ref: docs/plano-evolution-2026-09/PLANO_100_ETAPAS.md#E063

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Garantir coluna notified_at na tabela evolution_alerts
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'zapp'
       AND table_name   = 'evolution_alerts'
       AND column_name  = 'notified_at'
  ) THEN
    ALTER TABLE zapp.evolution_alerts ADD COLUMN notified_at timestamptz;
    RAISE NOTICE 'E063: coluna notified_at adicionada a zapp.evolution_alerts';
  ELSE
    RAISE NOTICE 'E063: coluna notified_at ja existe — skip';
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. fn_dispatch_critical_alert_emails — despacha alertas críticos/altos
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION zapp.fn_dispatch_critical_alert_emails()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = zapp, net, vault, public, pg_catalog
AS $$
DECLARE
  v_service_key  text;
  v_edge_url     text := 'https://supabase.atomicabr.com.br/functions/v1/alert-email-notify';
  v_alerts       jsonb;
  v_alert_count  int;
  v_request_id   bigint;
BEGIN
  -- Ler service_role key do Vault (não hardcodar em código)
  SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
   WHERE name = 'supabase_service_role_key'
   LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE WARNING 'E063: supabase_service_role_key nao encontrada no vault — abort';
    RETURN jsonb_build_object('ok', false, 'error', 'vault_secret_missing');
  END IF;

  -- Coletar alertas críticos/altos não resolvidos que ainda não foram notificados
  -- (ou foram notificados há mais de 1h — renotifica se persistirem)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id',         id::text,
      'alert_type', alert_type,
      'severity',   severity,
      'title',      title,
      'message',    message,
      'created_at', created_at
    )
    ORDER BY
      CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
      created_at DESC
  )
  INTO v_alerts
  FROM zapp.evolution_alerts
  WHERE severity   IN ('critical', 'high')
    AND resolved_at IS NULL
    AND (notified_at IS NULL OR notified_at < now() - interval '1 hour');

  v_alert_count := coalesce(jsonb_array_length(v_alerts), 0);

  IF v_alert_count = 0 THEN
    RETURN jsonb_build_object('ok', true, 'dispatched', 0, 'message', 'Nenhum alerta pendente');
  END IF;

  -- Marcar notified_at ANTES do dispatch para evitar duplo-envio em caso de retry
  UPDATE zapp.evolution_alerts
     SET notified_at = now()
   WHERE severity   IN ('critical', 'high')
     AND resolved_at IS NULL
     AND (notified_at IS NULL OR notified_at < now() - interval '1 hour');

  -- Disparar edge function via pg_net (async — não bloqueia o cron)
  SELECT net.http_post(
    url     := v_edge_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := jsonb_build_object('alerts', v_alerts)::text
  ) INTO v_request_id;

  RAISE NOTICE 'E063: % alerta(s) despachado(s) — request_id=%', v_alert_count, v_request_id;

  RETURN jsonb_build_object(
    'ok',         true,
    'dispatched', v_alert_count,
    'request_id', v_request_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'E063: erro em fn_dispatch_critical_alert_emails: %', SQLERRM;
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION zapp.fn_dispatch_critical_alert_emails() IS
  'E063: Despacha alertas críticos/altos não notificados para alert-email-notify via pg_net. Chamada pelo cron a cada 5min.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. fn_send_alert_heartbeat — heartbeat semanal "sistema vivo"
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION zapp.fn_send_alert_heartbeat()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = zapp, net, vault, public, pg_catalog
AS $$
DECLARE
  v_service_key  text;
  v_edge_url     text := 'https://supabase.atomicabr.com.br/functions/v1/alert-email-notify';
  v_open_count   int;
  v_request_id   bigint;
BEGIN
  SELECT decrypted_secret INTO v_service_key
    FROM vault.decrypted_secrets
   WHERE name = 'supabase_service_role_key'
   LIMIT 1;

  IF v_service_key IS NULL THEN
    RAISE WARNING 'E063-heartbeat: supabase_service_role_key nao encontrada no vault';
    RETURN jsonb_build_object('ok', false, 'error', 'vault_secret_missing');
  END IF;

  SELECT count(*) INTO v_open_count
    FROM zapp.evolution_alerts
   WHERE resolved_at IS NULL;

  -- Enviar heartbeat como alerta de severidade "medium" (informativo)
  SELECT net.http_post(
    url     := v_edge_url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body    := jsonb_build_object(
      'alerts', jsonb_build_array(
        jsonb_build_object(
          'id',         gen_random_uuid()::text,
          'alert_type', 'heartbeat',
          'severity',   'medium',
          'title',      'Sistema ZAPP operacional — heartbeat semanal',
          'message',    'Canal de notificação de alertas está ativo. Alertas abertos: ' || v_open_count::text || '. Este email confirma que o canal independente de wpp2 está funcionando.',
          'created_at', now()::text
        )
      )
    )::text
  ) INTO v_request_id;

  RAISE NOTICE 'E063-heartbeat: enviado (open_alerts=%) — request_id=%', v_open_count, v_request_id;

  RETURN jsonb_build_object(
    'ok',          true,
    'open_alerts', v_open_count,
    'request_id',  v_request_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'E063-heartbeat: erro: %', SQLERRM;
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION zapp.fn_send_alert_heartbeat() IS
  'E063: Heartbeat semanal — confirma que o canal de email está operacional, independente de wpp2.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. pg_cron: dispatch a cada 5min + heartbeat toda segunda às 08h (BRT=11h UTC)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Despacho de alertas críticos/altos — a cada 5 minutos
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'e063_dispatch_critical_alerts'
  ) THEN
    PERFORM cron.schedule(
      'e063_dispatch_critical_alerts',
      '*/5 * * * *',
      'SELECT zapp.fn_dispatch_critical_alert_emails()'
    );
    RAISE NOTICE 'E063: cron e063_dispatch_critical_alerts criado (5min)';
  ELSE
    RAISE NOTICE 'E063: cron e063_dispatch_critical_alerts ja existe — skip';
  END IF;

  -- Heartbeat semanal — toda segunda-feira às 11h UTC (08h BRT)
  IF NOT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'e063_alert_heartbeat_weekly'
  ) THEN
    PERFORM cron.schedule(
      'e063_alert_heartbeat_weekly',
      '0 11 * * 1',
      'SELECT zapp.fn_send_alert_heartbeat()'
    );
    RAISE NOTICE 'E063: cron e063_alert_heartbeat_weekly criado (seg 08h BRT)';
  ELSE
    RAISE NOTICE 'E063: cron e063_alert_heartbeat_weekly ja existe — skip';
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Verificação de sanidade
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_col_exists  bool;
  v_fn_dispatch bool;
  v_fn_hb       bool;
  v_cron_disp   bool;
  v_cron_hb     bool;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'zapp'
       AND table_name   = 'evolution_alerts'
       AND column_name  = 'notified_at'
  ) INTO v_col_exists;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'zapp' AND p.proname = 'fn_dispatch_critical_alert_emails'
  ) INTO v_fn_dispatch;

  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'zapp' AND p.proname = 'fn_send_alert_heartbeat'
  ) INTO v_fn_hb;

  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'e063_dispatch_critical_alerts'
  ) INTO v_cron_disp;

  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'e063_alert_heartbeat_weekly'
  ) INTO v_cron_hb;

  IF NOT (v_col_exists AND v_fn_dispatch AND v_fn_hb AND v_cron_disp AND v_cron_hb) THEN
    RAISE EXCEPTION 'E063: validacao falhou — col=% fn_dispatch=% fn_hb=% cron_disp=% cron_hb=%',
      v_col_exists, v_fn_dispatch, v_fn_hb, v_cron_disp, v_cron_hb;
  END IF;

  RAISE NOTICE 'E063: validacao OK — notified_at + 2 funcoes + 2 crons prontos';
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Registro em schema_migrations (workaround self-hosted)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260906060000',
  'e063_alert_email_notify',
  ARRAY[
    'ALTER TABLE zapp.evolution_alerts ADD COLUMN IF NOT EXISTS notified_at timestamptz',
    'CREATE OR REPLACE FUNCTION zapp.fn_dispatch_critical_alert_emails()',
    'CREATE OR REPLACE FUNCTION zapp.fn_send_alert_heartbeat()',
    'cron.schedule e063_dispatch_critical_alerts (5min)',
    'cron.schedule e063_alert_heartbeat_weekly (seg 11h UTC)'
  ]
)
ON CONFLICT (version) DO NOTHING;
