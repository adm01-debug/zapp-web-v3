-- E019.4: Corrigir sentinel 9999h em fn_pipeline_watchdog
-- Bug: COALESCE(v_last_event, now() - interval '9999 hours') quando v_last_event IS NULL
-- produz exatamente 9999.0, que aparece nas titles dos alertas como "ha 9999.0 horas".
-- Fix: tratar NULL explicitamente; usar label "nunca"; cap em 720h (30 dias).
-- Ref: docs/plano-evolution-2026-09/PLANO_100_ETAPAS.md#E019

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Reescrever fn_pipeline_watchdog com tratamento correto de NULL
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION zapp.fn_pipeline_watchdog()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = zapp, public
AS $$
DECLARE
  v_last_event   timestamptz;
  v_hours_silent numeric;
  v_label_silent text;
  v_pending_wh   int;
  v_alerts       jsonb := '[]'::jsonb;
  v_recent_alert bigint;
BEGIN
  SELECT MAX(created_at) INTO v_last_event
    FROM zapp.webhook_audit_log
   WHERE status = 'processed';

  -- E019 fix: NULL quando nunca houve evento processado; sem sentinel arbitrário.
  IF v_last_event IS NULL THEN
    v_hours_silent := NULL;
    v_label_silent := 'nunca';
  ELSE
    v_hours_silent := round(EXTRACT(EPOCH FROM (now() - v_last_event)) / 3600, 1);
    v_label_silent := CASE
      WHEN v_hours_silent > 720 THEN '>720h'
      ELSE v_hours_silent::text || 'h'
    END;
  END IF;

  SELECT count(*) INTO v_pending_wh
    FROM zapp.webhook_audit_log
   WHERE status = 'pending';

  -- Disparar alerta se silencioso > 4h OU se não há nenhum evento registrado.
  IF v_hours_silent IS NULL OR v_hours_silent > 4 THEN
    v_alerts := v_alerts || jsonb_build_object(
      'level', 'CRITICAL',
      'code',  'PIPELINE_SILENT',
      'msg',   'Sem webhooks processados ha ' || v_label_silent ||
               ' -- ultimo em ' || COALESCE(v_last_event::text, 'nunca')
    );

    SELECT COUNT(*) INTO v_recent_alert
      FROM zapp.evolution_alerts
     WHERE alert_type  = 'pipeline_silent'
       AND resolved_at IS NULL
       AND created_at  > now() - INTERVAL '4 hours';

    IF v_recent_alert = 0 THEN
      INSERT INTO zapp.evolution_alerts
        (id, alert_type, severity, title, message, payload, acknowledged, created_at)
      VALUES (
        gen_random_uuid(),
        'pipeline_silent',
        'critical',
        'Pipeline silencioso ha ' || v_label_silent,
        'Pipeline sem webhooks processados ha ' || v_label_silent,
        jsonb_build_object(
          'last_event',   v_last_event,
          'hours_silent', v_hours_silent,
          'source_table', 'zapp.webhook_audit_log'
        ),
        false,
        now()
      );
    END IF;
  ELSE
    UPDATE zapp.evolution_alerts
       SET resolved_at = now(),
           resolved_by = 'fn_pipeline_watchdog:auto'
     WHERE alert_type   = 'pipeline_silent'
       AND resolved_at IS NULL;
  END IF;

  IF v_pending_wh > 100 THEN
    v_alerts := v_alerts || jsonb_build_object(
      'level', 'WARNING',
      'code',  'WEBHOOK_BACKLOG',
      'msg',   v_pending_wh::text || ' webhooks pendentes'
    );
  END IF;

  RETURN jsonb_build_object(
    'checked_at',   now(),
    'last_event',   v_last_event,
    'hours_silent', v_hours_silent,
    'label_silent', v_label_silent,
    'pending_wh',   v_pending_wh,
    'alerts',       v_alerts,
    'alert_count',  jsonb_array_length(v_alerts),
    'status',       CASE WHEN jsonb_array_length(v_alerts) = 0 THEN 'ok' ELSE 'degraded' END,
    'source_table', 'zapp.webhook_audit_log'
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fechar alertas abertos com title contendo "9999" (falsos positivos do sentinel)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE zapp.evolution_alerts
   SET resolved_at = now(),
       resolved_by = 'e019_migration_sentinel_cleanup'
 WHERE alert_type   = 'pipeline_silent'
   AND resolved_at IS NULL
   AND title LIKE '%9999%';

-- ─────────────────────────────────────────────────────────────────────────────
-- Registro em schema_migrations (workaround self-hosted)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260906030000',
  'e019_pipeline_silent_fix',
  ARRAY[
    'CREATE OR REPLACE FUNCTION zapp.fn_pipeline_watchdog()',
    'UPDATE zapp.evolution_alerts sentinel_cleanup'
  ]
)
ON CONFLICT (version) DO NOTHING;
