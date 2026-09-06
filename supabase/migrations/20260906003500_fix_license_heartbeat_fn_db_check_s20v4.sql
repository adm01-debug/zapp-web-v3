-- Migration: fix_license_heartbeat_fn_db_check_s20v4
-- Data: 2026-09-06
-- Causa: fn_check_license_heartbeat() usava net.http_get para evolution_evolution:8080
--        inacessível desde extração do stack em 2026-08-12 → 513 falhas consecutivas.
-- Fix: substituir por check via DB (zapp.whatsapp_connections) — sem dependência de rede.

CREATE OR REPLACE FUNCTION zapp.fn_check_license_heartbeat()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_status text;
  v_connected_count int;
  v_falhas int;
BEGIN
  -- [S20 v4 2026-09-06] Substituído pg_net HTTP por check DB direto.
  -- Causa raiz do pg_net falhar: evolution_evolution:8080 inacessível desde
  -- extração do stack em 2026-08-12 (redes Docker separadas).
  -- Critério: instância wpp2 com status='connected' e is_active=true.
  SELECT count(*) INTO v_connected_count
  FROM zapp.whatsapp_connections
  WHERE status = 'connected' AND is_active = true;

  v_status := CASE WHEN v_connected_count > 0 THEN 'active' ELSE 'sem_resposta' END;

  INSERT INTO zapp.license_heartbeat_log(checked_at, status, http_code, raw)
  VALUES(
    now(),
    v_status,
    CASE WHEN v_connected_count > 0 THEN 200 ELSE 0 END,
    format('db_check_s20v4: %s instâncias connected/active', v_connected_count)
  );

  IF v_status <> 'active' THEN
    SELECT count(*) INTO v_falhas
    FROM zapp.license_heartbeat_log
    WHERE checked_at > now() - interval '3 hours' AND status <> 'active';

    IF v_falhas >= 3 THEN
      INSERT INTO zapp.evolution_alerts(alert_type, severity, title, message, payload, created_at)
      SELECT 'license_heartbeat', 'critical', 'Evolution API INATIVA',
        'Nenhuma instância WhatsApp conectada. Falhas: ' || v_falhas || '/3h',
        jsonb_build_object('connected_count', v_connected_count, 'source', 'db_check', 'fix', 's20v4'),
        now()
      WHERE NOT EXISTS(
        SELECT 1 FROM zapp.evolution_alerts ea
        WHERE ea.alert_type = 'license_heartbeat'
          AND ea.resolved_at IS NULL
          AND ea.created_at > now() - interval '4 hours'
      );
    END IF;
  ELSE
    UPDATE zapp.evolution_alerts
    SET resolved_at = now(), resolved_by = 'fn_check_license_heartbeat:s20v4_db_active'
    WHERE alert_type = 'license_heartbeat' AND resolved_at IS NULL;
  END IF;

  RETURN v_status;
END;
$$;
