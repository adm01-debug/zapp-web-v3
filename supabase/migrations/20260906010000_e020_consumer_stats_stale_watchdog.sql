-- E020: Watchdog de consumer parado (fn_consumer_stats_stale_alert)
-- Alerta se stats do consumer ficarem > 15 min sem atualização
-- Segunda camada: alerta se evolution_webhook_events_v2 ficar > 30 min stale em horário comercial
-- Ref: docs/plano-evolution-2026-09/PLANO_100_ETAPAS.md#E020

-- ─────────────────────────────────────────────────────────────────────────────
-- Função principal: verifica frescor dos stats do consumer
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION zapp.fn_consumer_stats_stale_alert()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = zapp, public
AS $$
DECLARE
  v_last_collected timestamptz;
  v_stale          boolean;
  v_open_count     int;
  v_alert_id       uuid;
BEGIN
  -- Verificar frescor dos stats do consumer via FDW
  BEGIN
    SELECT max(collected_at)
      INTO v_last_collected
      FROM evo.evolution_rabbit_consumer_stats_fdw;
  EXCEPTION WHEN OTHERS THEN
    -- FDW indisponível = consumer provavelmente parado
    v_last_collected := NULL;
  END;

  v_stale := (v_last_collected IS NULL OR v_last_collected < now() - interval '15 minutes');

  IF v_stale THEN
    -- Verificar se já existe alerta aberto para não duplicar
    SELECT count(*) INTO v_open_count
      FROM zapp.evolution_alerts
     WHERE alert_type = 'consumer_stats_stale'
       AND resolved_at IS NULL;

    IF v_open_count = 0 THEN
      INSERT INTO zapp.evolution_alerts (
        alert_type, severity, title, detail, instance_name, created_at
      ) VALUES (
        'consumer_stats_stale',
        'high',
        'Consumer RabbitMQ: stats parados há > 15 min',
        format(
          'Último collected_at: %s. Consumer pode estar parado ou sem consumir eventos do RabbitMQ.',
          COALESCE(v_last_collected::text, 'NENHUM DADO (tabela vazia)')
        ),
        'wpp2',
        now()
      )
      RETURNING id INTO v_alert_id;

      -- Notificar warroom via pg_net (N8N webhook)
      PERFORM net.http_post(
        url     := 'https://n8n.atomicabr.com.br/webhook/warroom-alert',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body    := json_build_object(
          'alert_type', 'consumer_stats_stale',
          'severity',   'high',
          'message',    format('⚠️ Consumer RabbitMQ PARADO: stats sem atualizar desde %s',
                               COALESCE(v_last_collected::text, 'NUNCA')),
          'alert_id',   v_alert_id,
          'source',     'fn_consumer_stats_stale_alert',
          'ts',         now()
        )::text::jsonb
      );
    END IF;

    RETURN format('ALERTA: consumer_stats_stale (last=%s, abertos=%s)',
                  COALESCE(v_last_collected::text, 'NULL'), v_open_count);
  ELSE
    -- Auto-resolve alertas abertos quando stats voltam
    UPDATE zapp.evolution_alerts
       SET resolved_at = now(),
           resolved_by = 'fn_consumer_stats_stale_alert_auto'
     WHERE alert_type = 'consumer_stats_stale'
       AND resolved_at IS NULL;

    RETURN format('OK: consumer_stats_stale (last=%s)', v_last_collected);
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Segunda camada: verifica frescor de evolution_webhook_events_v2 em horário comercial
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION zapp.fn_webhook_events_stale_alert()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = zapp, evo, public
AS $$
DECLARE
  v_last_event     timestamptz;
  v_is_business    boolean;
  v_stale          boolean;
  v_open_count     int;
  v_alert_id       uuid;
  v_hora           int;
  v_dow            int;
BEGIN
  -- Somente alerta em horário comercial UTC-3 (07:00–21:00, seg–sab)
  v_hora := extract(hour FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int;
  v_dow  := extract(dow  FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int; -- 0=dom, 6=sab
  v_is_business := (v_hora BETWEEN 7 AND 21) AND (v_dow BETWEEN 1 AND 6);

  IF NOT v_is_business THEN
    RETURN 'SKIP: fora do horário comercial';
  END IF;

  -- Verificar o último evento registrado
  SELECT max(created_at)
    INTO v_last_event
    FROM evo.evolution_webhook_events_v2
   WHERE created_at > now() - interval '24 hours';

  v_stale := (v_last_event IS NULL OR v_last_event < now() - interval '30 minutes');

  IF v_stale THEN
    SELECT count(*) INTO v_open_count
      FROM zapp.evolution_alerts
     WHERE alert_type = 'webhook_events_stale'
       AND resolved_at IS NULL;

    IF v_open_count = 0 THEN
      INSERT INTO zapp.evolution_alerts (
        alert_type, severity, title, detail, instance_name, created_at
      ) VALUES (
        'webhook_events_stale',
        'high',
        'Pipeline de eventos: sem eventos há > 30 min (horário comercial)',
        format(
          'Último evento em evolution_webhook_events_v2: %s. Pipeline pode estar interrompido.',
          COALESCE(v_last_event::text, 'NENHUM nos últimos 24h')
        ),
        'wpp2',
        now()
      )
      RETURNING id INTO v_alert_id;

      PERFORM net.http_post(
        url     := 'https://n8n.atomicabr.com.br/webhook/warroom-alert',
        headers := '{"Content-Type":"application/json"}'::jsonb,
        body    := json_build_object(
          'alert_type', 'webhook_events_stale',
          'severity',   'high',
          'message',    format('⚠️ PIPELINE SILENCIOSO: nenhum evento há > 30 min (último: %s)',
                               COALESCE(v_last_event::text, 'NUNCA em 24h')),
          'alert_id',   v_alert_id,
          'source',     'fn_webhook_events_stale_alert',
          'ts',         now()
        )::text::jsonb
      );
    END IF;

    RETURN format('ALERTA: webhook_events_stale (last=%s)', COALESCE(v_last_event::text, 'NULL'));
  ELSE
    UPDATE zapp.evolution_alerts
       SET resolved_at = now(),
           resolved_by = 'fn_webhook_events_stale_alert_auto'
     WHERE alert_type = 'webhook_events_stale'
       AND resolved_at IS NULL;

    RETURN format('OK: webhook_events_stale (last=%s)', v_last_event);
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Cron jobs (pg_cron)
-- ─────────────────────────────────────────────────────────────────────────────

-- Consumer stats: a cada 10 min
SELECT cron.schedule(
  'e020-consumer-stats-stale-watchdog',
  '*/10 * * * *',
  $$SELECT zapp.fn_consumer_stats_stale_alert()$$
);

-- Webhook events stale: a cada 15 min
SELECT cron.schedule(
  'e020-webhook-events-stale-watchdog',
  '*/15 * * * *',
  $$SELECT zapp.fn_webhook_events_stale_alert()$$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Registro em schema_migrations (workaround self-hosted)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260906010000',
  'e020_consumer_stats_stale_watchdog',
  ARRAY[
    'CREATE OR REPLACE FUNCTION zapp.fn_consumer_stats_stale_alert()',
    'CREATE OR REPLACE FUNCTION zapp.fn_webhook_events_stale_alert()',
    'SELECT cron.schedule e020-consumer-stats-stale-watchdog',
    'SELECT cron.schedule e020-webhook-events-stale-watchdog'
  ]
)
ON CONFLICT (version) DO NOTHING;
