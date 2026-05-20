-- ============================================================
-- APPLY THIS IN THE EXTERNAL FATOR X PROJECT (tdprnylgyrogbbhgdoik)
-- The Lovable Cloud migration tool cannot run this here because
-- public.evolution_messages does not exist in this project.
-- ============================================================

-- Lite version: essential fields only (no payload, no raw_data, no notes/tags)
CREATE OR REPLACE FUNCTION public.rpc_list_messages_lite(
  p_remote_jid text,
  p_instance text DEFAULT 'wpp2',
  p_limit int DEFAULT 50,
  p_before_date timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  message_id text,
  remote_jid text,
  from_me boolean,
  direction text,
  status text,
  message_type text,
  content text,
  media_url text,
  media_mimetype text,
  media_type text,
  media_filename text,
  caption text,
  quoted_message_id text,
  is_starred boolean,
  is_important boolean,
  sent_by_bot boolean,
  push_name text,
  instance_name text,
  created_at timestamptz,
  status_at timestamptz,
  deleted_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.message_id, m.remote_jid, m.from_me, m.direction, m.status,
         m.message_type, m.content, m.media_url, m.media_mimetype, m.media_type,
         m.media_filename, m.caption, m.quoted_message_id, m.is_starred,
         m.is_important, m.sent_by_bot, m.push_name, m.instance_name,
         m.created_at, m.status_at, m.deleted_at
  FROM public.evolution_messages m
  WHERE m.remote_jid = p_remote_jid
    AND m.instance_name = p_instance
    AND m.deleted_at IS NULL
    AND (p_before_date IS NULL OR m.created_at < p_before_date)
  ORDER BY m.created_at DESC
  LIMIT p_limit;
$$;

-- Single full row, on demand (includes payload + raw_data + notes + tags)
CREATE OR REPLACE FUNCTION public.rpc_get_message_details(
  p_message_id uuid
)
RETURNS public.evolution_messages
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.evolution_messages WHERE id = p_message_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_list_messages_lite(text, text, int, timestamptz) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_message_details(uuid) TO authenticated, anon;
