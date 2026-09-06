-- E062.6: Fechar alertas license_heartbeat abertos da era HTTP (stale)
-- Causa raiz: fn_check_license_heartbeat() tentava HTTP para evolution_evolution:8080,
--   inacessível desde 2026-08-12 (extração do stack para evolution-stack repo).
--   Isso gerou 513+ falhas consecutivas e 37 alertas abertos sem resolução.
-- Fix forward: migration 20260906003500 reescreveu a função para checar via DB
--   (zapp.whatsapp_connections). Mas os 37 alertas pré-existentes permaneceram abertos.
-- Esta migration: fecha os 37 alertas estagnados com anotação de causa raiz.
-- Ref: docs/plano-evolution-2026-09/PLANO_100_ETAPAS.md#E062

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fechar alertas license_heartbeat abertos da era HTTP (stale)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
    FROM zapp.evolution_alerts
   WHERE alert_type  = 'license_heartbeat'
     AND resolved_at IS NULL;

  IF v_count > 0 THEN
    UPDATE zapp.evolution_alerts
       SET resolved_at  = now(),
           resolved_by  = 'e062_migration_stale_http_era_cleanup',
           payload      = COALESCE(payload, '{}'::jsonb) || jsonb_build_object(
             'e062_note',       'Alerta da era HTTP: fn_check_license_heartbeat() tentava POST em evolution_evolution:8080, inacessível desde 2026-08-12 (extração do stack). 513+ falhas consecutivas geraram alertas sem resolução automática. Fix: DB check via zapp.whatsapp_connections (migration 20260906003500). Este alerta fechado em lote pela migration 20260906050000.',
             'e062_closed_at',  now(),
             'e062_root_cause', 'http_endpoint_inaccessible_post_stack_extraction_20260812',
             'e062_count',      v_count
           )
     WHERE alert_type  = 'license_heartbeat'
       AND resolved_at IS NULL;

    RAISE NOTICE 'E062.6: % alertas license_heartbeat (era HTTP) fechados.', v_count;
  ELSE
    RAISE NOTICE 'E062.6: nenhum alerta license_heartbeat aberto encontrado — nada a fazer.';
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Verificação de sanidade
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_open int;
BEGIN
  SELECT count(*) INTO v_open
    FROM zapp.evolution_alerts
   WHERE alert_type  = 'license_heartbeat'
     AND resolved_at IS NULL;

  IF v_open > 0 THEN
    RAISE EXCEPTION 'E062.6: ainda existem % alertas license_heartbeat abertos após cleanup — investigar.', v_open;
  END IF;

  RAISE NOTICE 'E062.6: validação OK — zero alertas license_heartbeat abertos.';
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Registro em schema_migrations (workaround self-hosted)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260906050000',
  'e062_close_stale_license_heartbeat_alerts',
  ARRAY[
    'UPDATE zapp.evolution_alerts SET resolved_at/resolved_by/payload WHERE alert_type=license_heartbeat AND resolved_at IS NULL',
    'DO $$ assert zero open license_heartbeat alerts $$'
  ]
)
ON CONFLICT (version) DO NOTHING;
