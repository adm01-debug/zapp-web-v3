-- Pendencia de design registrada desde a rodada 3 (migrations 20260902190000
-- e 20260902200000): duas chamadas verdadeiramente CONCORRENTES de
-- fn_sicoob_bridge_ingest_message para o MESMO remetente (mesmo
-- v_sicoob_user_id + p_singular_id) podem passar pela checagem de
-- idempotencia (SELECT em evo.evolution_messages) e pelo lookup de
-- sicoob_contact_mapping ANTES de qualquer uma das duas ter inserido --
-- ambas prosseguem, causando 2 problemas reais:
--
--   1. Contato duplicado: se o remetente e novo (sem mapping ainda), as duas
--      chamadas caem no ramo ELSE e cada uma faz seu proprio INSERT em
--      zapp.contacts + zapp.sicoob_contact_mapping -- 2 contatos para o
--      mesmo cooperado.
--
--   2. Falso idempotent=false em mensagem duplicada: o INSERT em
--      zapp.messages passa pela VIEW, cujo handler faz
--      `ON CONFLICT DO NOTHING` (nao lanca unique_violation -- ja
--      documentado nesta sessao). Em uma corrida real, a segunda chamada
--      insere depois da primeira, o ON CONFLICT descarta silenciosamente a
--      linha e `RETURNING id INTO v_message_id` fica NULL -- a funcao cai no
--      "sucesso" (nao no EXCEPTION WHEN unique_violation, que so pegaria uma
--      excecao real) e retorna `idempotent=false, message_id=NULL` para uma
--      mensagem que na verdade JA foi persistida pela chamada concorrente.
--      O `EXCEPTION WHEN unique_violation` existente nunca ajuda aqui porque
--      o handler da view nunca deixa a excecao escapar.
--
-- Fix: `pg_advisory_xact_lock` no INICIO da funcao, chave = hash de
-- `v_sicoob_user_id || '|' || p_singular_id` (identidade do remetente).
-- Serializa TODAS as chamadas concorrentes do MESMO remetente (cobre os 2
-- problemas acima, ja que ambos so acontecem quando a identidade colide);
-- chamadas de remetentes DIFERENTES continuam paralelas normalmente, sem
-- serializar a funcao inteira. Lock e transacional (`_xact_`) -- libera
-- sozinho no fim da chamada (commit ou rollback), sem risco de vazamento
-- mesmo se a funcao levantar excecao no meio.
--
-- Limitacao de validacao desta sessao: as ferramentas de banco disponiveis
-- (supabase_db_query) abrem uma conexao nova a cada chamada e nao sustentam
-- duas transacoes simultaneas de verdade -- nao foi possivel reproduzir a
-- corrida real (2 conexoes concorrentes de fato) para provar o bloqueio ao
-- vivo. `pg_advisory_xact_lock` e primitivo padrao e bem documentado do
-- Postgres para exatamente este padrao de "check-then-act"; a mudanca foi
-- validada apenas quanto a NAO regredir o comportamento sequencial (mesmos
-- resultados de idempotencia de antes, replay simples e replay
-- soft-deletado) -- nao quanto ao bloqueio cross-sessao em si.
CREATE OR REPLACE FUNCTION zapp.fn_sicoob_bridge_ingest_message(
  p_message_id text,
  p_sender_id text,
  p_sender_name text,
  p_sender_email text,
  p_sender_phone text,
  p_singular_name text,
  p_singular_id text,
  p_content text,
  p_vendedor_user_id text,
  p_created_at timestamptz
)
RETURNS TABLE (contact_id uuid, message_id uuid, idempotent boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'zapp'
AS $function$
DECLARE
  v_contact_id     uuid;
  v_agent_id       uuid;
  v_message_id     uuid;
  v_sicoob_user_id text := COALESCE(p_sender_id, 'sender-' || p_message_id);
  v_phone          text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(v_sicoob_user_id || '|' || coalesce(p_singular_id, ''), 42));

  SELECT em.contact_id, em.id INTO v_contact_id, v_message_id
  FROM evo.evolution_messages em
  WHERE em.message_id = p_message_id
    AND em.instance_name = 'wpp2';

  IF v_message_id IS NOT NULL THEN
    RETURN QUERY SELECT v_contact_id, v_message_id, true;
    RETURN;
  END IF;

  SELECT m.contact_id, m.zappweb_agent_id INTO v_contact_id, v_agent_id
  FROM zapp.sicoob_contact_mapping m
  WHERE m.sicoob_user_id = v_sicoob_user_id
    AND m.sicoob_singular_id IS NOT DISTINCT FROM p_singular_id;

  IF v_contact_id IS NOT NULL THEN
    UPDATE zapp.contacts SET name = COALESCE(p_sender_name, name),
                              company = COALESCE(p_singular_name, company),
                              updated_at = now()
    WHERE id = v_contact_id;
  ELSE
    SELECT id INTO v_agent_id FROM zapp.profiles LIMIT 1;
    v_phone := CASE
      WHEN p_sender_phone IS NULL THEN
        substr(translate(md5(jsonb_build_array(v_sicoob_user_id, p_singular_id)::text), 'abcdef', '012345'), 1, 30)
      WHEN length(p_sender_phone) <= 34 THEN
        p_sender_phone
      ELSE
        substr(translate(md5(jsonb_build_array('phone', p_sender_phone)::text), 'abcdef', '012345'), 1, 30)
    END;

    INSERT INTO zapp.contacts (
      name, phone, email, company, contact_type, channel_type, assigned_to, tags, notes
    ) VALUES (
      p_sender_name, v_phone, p_sender_email, p_singular_name, 'sicoob_gifts', 'internal_chat', v_agent_id,
      ARRAY['sicoob-gifts'], 'Cooperado da singular: ' || COALESCE(p_singular_name, 'desconhecida')
        || ' (' || COALESCE(p_singular_id, 'sem singular_id') || ')'
    ) RETURNING id INTO v_contact_id;

    INSERT INTO zapp.sicoob_contact_mapping (
      contact_id, sicoob_user_id, sicoob_vendedor_id, sicoob_singular_id, zappweb_agent_id
    ) VALUES (
      v_contact_id, v_sicoob_user_id, p_vendedor_user_id, p_singular_id, v_agent_id
    );
  END IF;

  BEGIN
    INSERT INTO zapp.messages (
      contact_id, content, sender, message_type, external_id, channel_type, is_read, status, created_at
    ) VALUES (
      v_contact_id, p_content, 'contact', 'text', p_message_id, 'internal_chat', false, 'delivered', COALESCE(p_created_at, now())
    ) RETURNING id INTO v_message_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT v_contact_id, NULL::uuid, true;
    RETURN;
  END;

  UPDATE zapp.contacts SET updated_at = now() WHERE id = v_contact_id;

  RETURN QUERY SELECT v_contact_id, v_message_id, false;
END;
$function$;
