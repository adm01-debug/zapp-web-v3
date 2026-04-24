-- =====================================================================
-- FATOR X migration — auditoria de mudanças em evolution_contacts
-- Projeto: tdprnylgyrogbbhgdoik (banco externo)
-- Data:    2026-04-24
--
-- Objetivo
--   Registrar em evolution_audit_log toda alteração (UPDATE) ou remoção
--   (DELETE / soft delete) de linhas em evolution_contacts, capturando:
--     - instance_name
--     - remote_jid
--     - quem disparou (auth.uid() quando vier do PostgREST autenticado;
--       'system' quando vier do service_role / webhook / integração)
--     - diff dos campos relevantes (lead_status, assigned_to, tags, name,
--       push_name, deleted_at)
--
-- Notas
--   * Reaproveita a infra existente: evolution_audit_log + fn_safe_audit_log.
--   * O catálogo de actions aceita: contact_updated, contact_deleted,
--     contact_restored (já presentes na lista de 47 valores aceitos).
--   * AFTER trigger para não bloquear o write path do webhook.
--   * SECURITY DEFINER para garantir INSERT mesmo quando o caller for
--     anon/authenticated com RLS restritivo em evolution_audit_log.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.fn_audit_evolution_contacts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action       text;
  v_actor        text;
  v_actor_kind   text;
  v_changed      jsonb := '{}'::jsonb;
  v_target_jid   text;
  v_instance     text;
BEGIN
  -- Identifica ator: auth.uid() quando vier de chamada autenticada;
  -- senão usa current_setting('request.jwt.claim.role') / 'system'.
  BEGIN
    IF auth.uid() IS NOT NULL THEN
      v_actor      := auth.uid()::text;
      v_actor_kind := 'user';
    ELSE
      v_actor      := COALESCE(
        NULLIF(current_setting('request.jwt.claim.role', true), ''),
        'system'
      );
      v_actor_kind := CASE WHEN v_actor = 'service_role' THEN 'service' ELSE 'system' END;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_actor      := 'system';
    v_actor_kind := 'system';
  END;

  IF TG_OP = 'DELETE' THEN
    v_action     := 'contact_deleted';
    v_target_jid := OLD.remote_jid;
    v_instance   := OLD.instance_name;
    v_changed    := jsonb_build_object(
      'old', to_jsonb(OLD),
      'hard_delete', true
    );

  ELSIF TG_OP = 'UPDATE' THEN
    v_target_jid := NEW.remote_jid;
    v_instance   := NEW.instance_name;

    -- Soft delete (deleted_at passou de NULL para NOT NULL)
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      v_action := 'contact_deleted';
    -- Restore (deleted_at passou de NOT NULL para NULL)
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      v_action := 'contact_restored';
    ELSE
      v_action := 'contact_updated';
    END IF;

    -- Diff apenas dos campos relevantes para reduzir ruído.
    IF OLD.lead_status   IS DISTINCT FROM NEW.lead_status THEN
      v_changed := v_changed || jsonb_build_object(
        'lead_status', jsonb_build_object('from', OLD.lead_status, 'to', NEW.lead_status)
      );
    END IF;
    IF OLD.assigned_to   IS DISTINCT FROM NEW.assigned_to THEN
      v_changed := v_changed || jsonb_build_object(
        'assigned_to', jsonb_build_object('from', OLD.assigned_to, 'to', NEW.assigned_to)
      );
    END IF;
    IF OLD.tags          IS DISTINCT FROM NEW.tags THEN
      v_changed := v_changed || jsonb_build_object(
        'tags', jsonb_build_object('from', OLD.tags, 'to', NEW.tags)
      );
    END IF;
    IF OLD.name          IS DISTINCT FROM NEW.name THEN
      v_changed := v_changed || jsonb_build_object(
        'name', jsonb_build_object('from', OLD.name, 'to', NEW.name)
      );
    END IF;
    IF OLD.push_name     IS DISTINCT FROM NEW.push_name THEN
      v_changed := v_changed || jsonb_build_object(
        'push_name', jsonb_build_object('from', OLD.push_name, 'to', NEW.push_name)
      );
    END IF;
    IF OLD.deleted_at    IS DISTINCT FROM NEW.deleted_at THEN
      v_changed := v_changed || jsonb_build_object(
        'deleted_at', jsonb_build_object('from', OLD.deleted_at, 'to', NEW.deleted_at)
      );
    END IF;

    -- Se nada relevante mudou, não polui a auditoria.
    IF v_changed = '{}'::jsonb THEN
      RETURN NEW;
    END IF;
  ELSE
    RETURN NULL;
  END IF;

  -- Insert resiliente: nunca quebra o write path do webhook.
  BEGIN
    PERFORM public.fn_safe_audit_log(
      p_entity_type  := 'evolution_contact',
      p_entity_id    := v_target_jid,
      p_action       := v_action,
      p_performed_by := v_actor,
      p_metadata     := jsonb_build_object(
        'instance_name', v_instance,
        'remote_jid',    v_target_jid,
        'actor_kind',    v_actor_kind,
        'changed',       v_changed,
        'op',            TG_OP,
        'at',            now()
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Nunca bloqueia o UPDATE/DELETE do contato por falha de auditoria.
    RAISE WARNING 'fn_audit_evolution_contacts: audit insert failed: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger único cobrindo UPDATE e DELETE.
DROP TRIGGER IF EXISTS trg_audit_evolution_contacts ON public.evolution_contacts;

CREATE TRIGGER trg_audit_evolution_contacts
AFTER UPDATE OR DELETE ON public.evolution_contacts
FOR EACH ROW
EXECUTE FUNCTION public.fn_audit_evolution_contacts();

-- =====================================================================
-- Verificação rápida pós-deploy
-- =====================================================================
-- 1) Trigger criado:
--    SELECT tgname, tgrelid::regclass FROM pg_trigger
--     WHERE tgname = 'trg_audit_evolution_contacts';
--
-- 2) Smoke test (não destrutivo):
--    UPDATE public.evolution_contacts
--       SET lead_status = lead_status
--     WHERE remote_jid = '<algum_jid>' AND instance_name = 'wpp2';
--    -- não deve gerar audit (nada mudou)
--
--    UPDATE public.evolution_contacts
--       SET lead_status = 'hot'
--     WHERE remote_jid = '<algum_jid>' AND instance_name = 'wpp2';
--    SELECT * FROM public.evolution_audit_log
--     WHERE entity_type = 'evolution_contact'
--     ORDER BY created_at DESC LIMIT 5;
-- =====================================================================
