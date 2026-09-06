-- E027: Corrigir fn_auto_resolve_alerts — resolver por condição, nunca por idade
-- Bug: cláusula `ddl_policy_churn` resolvia alertas após 2h de vida do alerta,
--      independentemente de a condição (DDL churn) ter cessado de fato.
--      Isso mascara incidentes: um alerta de DDL churn criado às 00h era
--      auto-resolvido às 02h mesmo se o churn continuasse ativo.
-- Fix: substituir `AND created_at < now() - interval '2 hours'` por
--      `AND NOT EXISTS (SELECT 1 FROM ops.ddl_audit WHERE "at" > now() - interval '2 hours')`.
--      A coluna `"at"` (quoted — palavra reservada) é indexada (idx_ddl_audit_at).
-- Ref: docs/plano-evolution-2026-09/PLANO_100_ETAPAS.md#E027

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Reescrever fn_auto_resolve_alerts com resolução baseada em condição real
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION zapp.fn_auto_resolve_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = zapp, ops, public, pg_catalog
AS $$
BEGIN
  -- ── Saturação de conexões: resolver quando o pool voltou ao normal
  UPDATE zapp.evolution_alerts
     SET resolved_at = now(),
         resolved_by = 'auto_resolve_cron:connection_saturation_cleared'
   WHERE alert_type = 'connection_saturation'
     AND resolved IS NOT TRUE
     AND NOT EXISTS (
       SELECT 1
         FROM pg_stat_activity
        WHERE backend_type = 'client backend'
       HAVING count(*) > 0.8 * current_setting('max_connections')::int
     );

  -- ── Alta taxa de 401: resolver quando a taxa voltou ao normal (janela 1h)
  UPDATE zapp.evolution_alerts
     SET resolved_at = now(),
         resolved_by = 'auto_resolve_cron:high_401_rate_cleared'
   WHERE alert_type = 'high_401_rate'
     AND resolved IS NOT TRUE
     AND created_at < now() - interval '1 hour'
     AND NOT EXISTS (
       SELECT 1
         FROM public.evo_traefik_401_stats
        WHERE collected_at > now() - interval '1 hour'
       HAVING sum("count") > 500
     );

  -- ── DDL churn: resolver SOMENTE se não houve DDL novo nas últimas 2h
  --    (condição real — NÃO por idade do alerta)
  --    ops.ddl_audit."at" é indexado por idx_ddl_audit_at; guard de existência
  --    da tabela incluído pois ela foi criada manualmente em produção.
  IF to_regclass('ops.ddl_audit') IS NOT NULL THEN
    UPDATE zapp.evolution_alerts
       SET resolved_at = now(),
           resolved_by = 'auto_resolve_cron:ddl_condition_cleared'
     WHERE alert_type = 'ddl_policy_churn'
       AND resolved IS NOT TRUE
       AND NOT EXISTS (
         SELECT 1
           FROM ops.ddl_audit
          WHERE "at" > now() - interval '2 hours'
       );
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Verificação de sanidade: garantir que a cláusula age-based foi removida
--    (sem efeito em produção — serve como assertion de auditoria futura)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_body text;
BEGIN
  SELECT prosrc INTO v_body
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'zapp'
     AND p.proname = 'fn_auto_resolve_alerts';

  -- A função não deve mais conter a lógica de age-based resolve para ddl_policy_churn
  IF v_body LIKE '%ddl_policy_churn%AND created_at < now()%' THEN
    RAISE EXCEPTION 'E027: fn_auto_resolve_alerts ainda contém cláusula age-based para ddl_policy_churn — migration falhou';
  END IF;

  RAISE NOTICE 'E027: fn_auto_resolve_alerts validada — ddl_policy_churn resolve por condição real';
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Registro em schema_migrations (workaround self-hosted)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES (
  '20260906040000',
  'e027_auto_resolve_condition_based',
  ARRAY[
    'CREATE OR REPLACE FUNCTION zapp.fn_auto_resolve_alerts()',
    'DO $$ assert ddl_policy_churn age-based clause removed $$'
  ]
)
ON CONFLICT (version) DO NOTHING;
