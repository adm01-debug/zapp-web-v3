-- Pendencia aberta desde a migration 20260902170000_harden_unguarded_crm_rpcs.sql:
-- rpc_delete_message, rpc_change_deal_stage/rpc_move_deal/rpc_upsert_deal,
-- rpc_purge_contact_intelligence, bulk_update_lead_status, grant_lgpd_consent,
-- revoke_lgpd_consent e rpc_complete_task ja exigiam fn_require_app_user() (piso
-- minimo de sessao valida), mas nenhuma verificava posse do registro-alvo --
-- qualquer agente autenticado podia apagar mensagem de contato alheio, mudar
-- estagio/mover negocio nao atribuido a si, purgar inteligencia de IA de
-- qualquer contato, mudar lead status em massa, conceder/revogar consentimento
-- LGPD ou completar tarefa de outro agente.
--
-- Decisao de negocio (dono, via pergunta explicita nesta sessao com as 3
-- opcoes -- manter aberto, restringir a admin/dono, ou hibrido apenas para
-- dados sensiveis): "Restringir a admin/supervisor ou dono do registro".
--
-- Modelo implementado: cada RPC agora exige, alem de fn_require_app_user(),
-- que o CHAMADOR REAL (auth.uid(), nunca parametro) seja
-- zapp.is_admin_or_supervisor() OU o assigned_to do registro-alvo. Coluna
-- "dono" por entidade (confirmada ao vivo via information_schema antes de
-- escrever esta migration):
--   - evolution_contacts / contacts (mesma entidade fisica): assigned_to
--     (character varying, grava o uuid do profile como texto -- comparado
--     com auth.uid()::text)
--   - evolution_deals: assigned_to (mesmo formato)
--   - evolution_tasks: assigned_to (mesmo formato)
--   - evolution_messages: sem coluna de dono propria -- dono e o assigned_to
--     do contato (contact_id) a que a mensagem pertence
--   - contact_intelligence: sem coluna de dono propria -- dono e o
--     assigned_to do contato (contact_id) a que a inteligencia se refere
-- Registro SEM dono (assigned_to NULL, ex.: contato/negocio/tarefa nunca
-- atribuido) so pode ser mexido por admin/supervisor -- nao ha "dono"
-- implicito para nenhum agente comum reivindicar.
--
-- Verificacao de callers reais (grep em src/ e supabase/functions/, feita
-- antes de escrever esta migration):
--   - rpc_delete_message: unico caller real e
--     src/hooks/monitoring/useMonitoringManagement.ts, que apaga uma
--     mensagem de TESTE criada pelo proprio teste de webhook (nao um fluxo de
--     usuario apagando mensagem alheia). Preservado o comportamento de
--     "mensagem nao encontrada -> ok:true, deleted:0" (idempotente, sem
--     checagem de posse quando nao ha o que apagar); a checagem de posse so
--     entra quando a mensagem EXISTE.
--   - grant_lgpd_consent / revoke_lgpd_consent: caller real e
--     src/components/contacts/ContactConsentManager.tsx (paineis
--     ContactFormV3/EditContactDialog). ATENCAO: hoje esses paineis abrem
--     para qualquer contato visivel ao agente, nao apenas os atribuidos a
--     ele -- esta mudanca pode bloquear um agente que gerencia consentimento
--     de um contato que nao e seu. Efeito colateral aceito conscientemente
--     pelo dono ao escolher esta opcao (a alternativa hibrida, que teria
--     deixado LGPD aberta, foi rejeitada). Precisa validacao em uso real
--     pos-deploy (nao coberta por teste automatizado nesta sessao).
--   - rpc_change_deal_stage, rpc_move_deal, rpc_upsert_deal,
--     rpc_purge_contact_intelligence, bulk_update_lead_status,
--     rpc_complete_task: ZERO callers reais no repo (frontend ou edge
--     functions) -- confirmado via grep. Restringir nao muda nenhum
--     comportamento observavel hoje em producao.
--
-- rpc_upsert_deal: a restricao so se aplica ao ramo de UPDATE (p_id nao nulo
-- -- editar negocio existente). O ramo de INSERT (criar negocio novo) segue
-- livre para qualquer app user, pois um negocio novo ainda nao tem dono.
--
-- bulk_update_lead_status: em vez de bloquear a chamada inteira, o filtro de
-- posse entra direto no WHERE do UPDATE -- contatos que nao sao do chamador
-- (e o chamador nao e admin/supervisor) sao silenciosamente ignorados. O
-- retorno ja distinguia 'requested' de 'updated', entao uma chamada parcial
-- fica visivel ao caller sem precisar de outro campo.

CREATE OR REPLACE FUNCTION zapp.bulk_update_lead_status(p_contact_ids uuid[], p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'zapp', 'monitoring'
AS $function$ DECLARE v_updated int; BEGIN
  PERFORM zapp.fn_require_app_user();
  IF p_contact_ids IS NULL OR array_length(p_contact_ids,1) IS NULL OR coalesce(length(trim(p_status)),0)=0 THEN RETURN jsonb_build_object('success',false,'message','p_contact_ids e p_status sao obrigatorios'); END IF;
  UPDATE zapp.evolution_contacts SET lead_status=p_status, version=coalesce(version,0)+1, updated_at=now()
  WHERE id = ANY(p_contact_ids) AND deleted_at IS NULL
    AND (zapp.is_admin_or_supervisor() OR assigned_to = auth.uid()::text);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  INSERT INTO zapp.evolution_audit_log (action, entity_type, performed_by, performed_by_type, metadata, created_at) VALUES ('bulk_update_lead_status','contact', coalesce(auth.uid()::text,'system'),'user', jsonb_build_object('status',p_status,'requested',array_length(p_contact_ids,1),'updated',v_updated), now()); RETURN jsonb_build_object('success',true,'updated',v_updated); END $function$;

CREATE OR REPLACE FUNCTION zapp.grant_lgpd_consent(p_contact_id uuid, p_channel text, p_marketing_consent boolean DEFAULT true, p_data_sharing boolean DEFAULT false, p_profiling boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'zapp', 'monitoring'
AS $function$ DECLARE v_ok int; BEGIN
  PERFORM zapp.fn_require_app_user();
  IF NOT (zapp.is_admin_or_supervisor() OR EXISTS (SELECT 1 FROM zapp.evolution_contacts WHERE id=p_contact_id AND assigned_to = auth.uid()::text)) THEN
    RETURN jsonb_build_object('success',false,'message','sem permissao: contato nao e seu nem voce e admin/supervisor');
  END IF;
  UPDATE zapp.evolution_contacts SET lgpd_consent_at=now(), lgpd_consent_channel=p_channel, lgpd_marketing_consent=coalesce(p_marketing_consent,true), lgpd_data_sharing=coalesce(p_data_sharing,false), lgpd_profiling=coalesce(p_profiling,false), lgpd_opt_out_at=NULL, lgpd_last_updated_at=now(), version=coalesce(version,0)+1, updated_at=now() WHERE id=p_contact_id AND deleted_at IS NULL; GET DIAGNOSTICS v_ok = ROW_COUNT; IF v_ok=0 THEN RETURN jsonb_build_object('success',false,'message','contato nao encontrado'); END IF; INSERT INTO zapp.evolution_audit_log (action, entity_type, entity_id, performed_by, performed_by_type, metadata, created_at) VALUES ('lgpd_consent_granted','contact',p_contact_id, coalesce(auth.uid()::text,'system'),'user', jsonb_build_object('channel',p_channel,'marketing',p_marketing_consent,'data_sharing',p_data_sharing,'profiling',p_profiling), now()); RETURN jsonb_build_object('success',true,'contact_id',p_contact_id); END $function$;

CREATE OR REPLACE FUNCTION zapp.revoke_lgpd_consent(p_contact_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'zapp', 'monitoring'
AS $function$ DECLARE v_ok int; BEGIN
  PERFORM zapp.fn_require_app_user();
  IF NOT (zapp.is_admin_or_supervisor() OR EXISTS (SELECT 1 FROM zapp.evolution_contacts WHERE id=p_contact_id AND assigned_to = auth.uid()::text)) THEN
    RETURN jsonb_build_object('success',false,'message','sem permissao: contato nao e seu nem voce e admin/supervisor');
  END IF;
  UPDATE zapp.evolution_contacts SET lgpd_opt_out_at=now(), lgpd_marketing_consent=false, lgpd_data_sharing=false, lgpd_profiling=false, lgpd_last_updated_at=now(), version=coalesce(version,0)+1, updated_at=now() WHERE id=p_contact_id AND deleted_at IS NULL; GET DIAGNOSTICS v_ok = ROW_COUNT; IF v_ok=0 THEN RETURN jsonb_build_object('success',false,'message','contato nao encontrado'); END IF; INSERT INTO zapp.evolution_audit_log (action, entity_type, entity_id, performed_by, performed_by_type, metadata, created_at) VALUES ('lgpd_consent_revoked','contact',p_contact_id, coalesce(auth.uid()::text,'system'),'user', jsonb_build_object('reason',p_reason), now()); RETURN jsonb_build_object('success',true,'contact_id',p_contact_id); END $function$;

CREATE OR REPLACE FUNCTION zapp.rpc_complete_task(p_id uuid, p_completed_by text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS zapp.evolution_tasks
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'zapp', 'monitoring'
AS $function$ DECLARE v_row evolution_tasks; BEGIN
  PERFORM zapp.fn_require_app_user();
  IF NOT (zapp.is_admin_or_supervisor() OR EXISTS (SELECT 1 FROM evolution_tasks WHERE id=p_id AND assigned_to = auth.uid()::text)) THEN
    RAISE EXCEPTION 'Permissao negada: tarefa nao atribuida a voce' USING ERRCODE = '42501';
  END IF;
  UPDATE evolution_tasks SET status='completed', completed_at=now(), completed_by=COALESCE(auth.uid()::text, p_completed_by), notes=COALESCE(p_notes,notes), updated_at=now() WHERE id=p_id RETURNING * INTO v_row; RETURN v_row; END; $function$;

CREATE OR REPLACE FUNCTION zapp.rpc_delete_message(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'zapp', 'public', 'pg_catalog'
AS $function$
DECLARE v_cnt int; v_contact_id uuid;
BEGIN
  PERFORM zapp.fn_require_app_user();
  SELECT contact_id INTO v_contact_id FROM zapp.evolution_messages WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', true, 'deleted', 0);
  END IF;
  IF NOT (zapp.is_admin_or_supervisor() OR EXISTS (SELECT 1 FROM zapp.evolution_contacts WHERE id=v_contact_id AND assigned_to = auth.uid()::text)) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'sem permissao: contato nao e seu nem voce e admin/supervisor');
  END IF;
  DELETE FROM zapp.evolution_messages WHERE id = p_id;
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'deleted', v_cnt);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION zapp.rpc_change_deal_stage(p_id uuid, p_new_stage text, p_performed_by text DEFAULT 'frontend'::text, p_lost_reason text DEFAULT NULL::text, p_lost_notes text DEFAULT NULL::text)
 RETURNS zapp.evolution_deals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'zapp', 'monitoring'
AS $function$ DECLARE v_old_stage text; v_row evolution_deals; BEGIN
  PERFORM zapp.fn_require_app_user();
  IF NOT (zapp.is_admin_or_supervisor() OR EXISTS (SELECT 1 FROM evolution_deals WHERE id=p_id AND assigned_to = auth.uid()::text)) THEN
    RAISE EXCEPTION 'Permissao negada: negocio nao atribuido a voce' USING ERRCODE = '42501';
  END IF;
 SELECT stage INTO v_old_stage FROM evolution_deals WHERE id=p_id; UPDATE evolution_deals SET stage=p_new_stage, stage_changed_at=now(), lost_reason=CASE WHEN p_new_stage='lost' THEN p_lost_reason ELSE lost_reason END, actual_close_date=CASE WHEN p_new_stage IN ('won','lost') THEN CURRENT_DATE ELSE actual_close_date END, updated_at=now() WHERE id=p_id RETURNING * INTO v_row; RETURN v_row; END; $function$;

CREATE OR REPLACE FUNCTION zapp.rpc_move_deal(p_deal_id uuid, p_new_stage character varying, p_user character varying DEFAULT 'system'::character varying)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'zapp', 'monitoring'
AS $function$ DECLARE v_old_stage VARCHAR; v_result JSONB; BEGIN
  PERFORM zapp.fn_require_app_user();
  IF NOT (zapp.is_admin_or_supervisor() OR EXISTS (SELECT 1 FROM evolution_deals WHERE id=p_deal_id AND assigned_to = auth.uid()::text)) THEN
    RAISE EXCEPTION 'Permissao negada: negocio nao atribuido a voce' USING ERRCODE = '42501';
  END IF;
 SELECT stage INTO v_old_stage FROM evolution_deals WHERE id=p_deal_id; UPDATE evolution_deals SET stage=p_new_stage, stage_changed_at=NOW(), actual_close_date=CASE WHEN p_new_stage IN ('pago','pedido_finalizado','perdido') THEN CURRENT_DATE ELSE actual_close_date END WHERE id=p_deal_id; SELECT jsonb_build_object('success',TRUE,'deal_id',p_deal_id,'old_stage',v_old_stage,'new_stage',p_new_stage,'moved_at',NOW()) INTO v_result; RETURN v_result; END; $function$;

CREATE OR REPLACE FUNCTION zapp.rpc_upsert_deal(p_title text, p_id uuid DEFAULT NULL::uuid, p_contact_id uuid DEFAULT NULL::uuid, p_conversation_id uuid DEFAULT NULL::uuid, p_description text DEFAULT NULL::text, p_stage text DEFAULT NULL::text, p_value numeric DEFAULT NULL::numeric, p_cost numeric DEFAULT NULL::numeric, p_discount_percent numeric DEFAULT NULL::numeric, p_products jsonb DEFAULT NULL::jsonb, p_expected_close_date date DEFAULT NULL::date, p_assigned_to text DEFAULT NULL::text, p_probability integer DEFAULT NULL::integer, p_source text DEFAULT NULL::text, p_tags text[] DEFAULT NULL::text[], p_notes text DEFAULT NULL::text, p_instance text DEFAULT 'wpp_pink_test'::text)
 RETURNS zapp.evolution_deals
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'zapp', 'monitoring'
AS $function$
DECLARE v_row zapp.evolution_deals;
BEGIN
  PERFORM zapp.fn_require_app_user();
  IF p_id IS NULL THEN
    INSERT INTO zapp.evolution_deals(contact_id, conversation_id, title, description, stage, value, cost, discount_percent, products, expected_close_date, assigned_to, probability, source, tags, notes, instance_name, created_at, updated_at)
    VALUES(p_contact_id, p_conversation_id, p_title, p_description, COALESCE(p_stage,'new'), p_value, p_cost, COALESCE(p_discount_percent,0), COALESCE(p_products,'[]'), p_expected_close_date, p_assigned_to, COALESCE(p_probability,10), p_source, p_tags, p_notes, p_instance, now(), now())
    RETURNING * INTO v_row;
  ELSE
    IF NOT (zapp.is_admin_or_supervisor() OR EXISTS (SELECT 1 FROM zapp.evolution_deals WHERE id=p_id AND assigned_to = auth.uid()::text)) THEN
      RAISE EXCEPTION 'Permissao negada: negocio nao atribuido a voce' USING ERRCODE = '42501';
    END IF;
    UPDATE zapp.evolution_deals SET title=COALESCE(p_title,title), description=COALESCE(p_description,description), stage=COALESCE(p_stage,stage), value=COALESCE(p_value,value), assigned_to=COALESCE(p_assigned_to,assigned_to), probability=COALESCE(p_probability,probability), notes=COALESCE(p_notes,notes), updated_at=now()
    WHERE id=p_id RETURNING * INTO v_row;
  END IF;
  RETURN v_row;
END; $function$;

CREATE OR REPLACE FUNCTION zapp.rpc_purge_contact_intelligence(p_contact_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'zapp', 'pg_temp'
AS $function$
BEGIN
  PERFORM zapp.fn_require_app_user();
  IF NOT (zapp.is_admin_or_supervisor() OR EXISTS (SELECT 1 FROM zapp.evolution_contacts WHERE id=p_contact_id AND assigned_to = auth.uid()::text)) THEN
    RAISE EXCEPTION 'Permissao negada: contato nao atribuido a voce' USING ERRCODE = '42501';
  END IF;
  DELETE FROM zapp.contact_intelligence WHERE contact_id = p_contact_id;
END;
$function$;
