CREATE OR REPLACE FUNCTION public.rpc_conversation_sla_panel(
  p_status text DEFAULT NULL,        -- 'on_track' | 'at_risk' | 'breached'
  p_priority text DEFAULT NULL,      -- 'low' | 'medium' | 'high' | 'critical'
  p_queue_id uuid DEFAULT NULL,
  p_assigned_to uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT 200
)
RETURNS TABLE (
  contact_id uuid,
  contact_name text,
  contact_phone text,
  channel_type text,
  queue_id uuid,
  queue_name text,
  queue_color text,
  assigned_to uuid,
  agent_name text,
  priority text,
  first_response_minutes int,
  resolution_minutes int,
  entered_queue_at timestamptz,
  assigned_at timestamptz,
  first_response_at timestamptz,
  resolved_at timestamptz,
  wait_seconds int,
  handle_seconds int,
  first_response_seconds int,
  first_response_breached boolean,
  resolution_breached boolean,
  sla_status text,
  sla_progress_pct numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role text;
BEGIN
  -- Apenas admin/supervisor podem ler
  SELECT role::text INTO v_role
    FROM public.user_roles
   WHERE user_id = auth.uid()
   ORDER BY CASE role::text WHEN 'admin' THEN 1 WHEN 'supervisor' THEN 2 ELSE 3 END
   LIMIT 1;

  IF v_role NOT IN ('admin','supervisor','manager','dev') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      c.id  AS contact_id,
      c.name AS contact_name,
      c.phone AS contact_phone,
      c.channel_type,
      c.queue_id,
      q.name AS queue_name,
      q.color AS queue_color,
      c.assigned_to,
      p.name AS agent_name,
      COALESCE(cfg.priority, q.sla_priority, 'medium') AS priority,
      COALESCE(cfg.first_response_minutes, 15) AS first_response_minutes,
      COALESCE(cfg.resolution_minutes, 240) AS resolution_minutes,
      qp.entered_at AS entered_queue_at,
      al.assigned_at,
      cs.first_response_at,
      cs.resolved_at,
      cs.first_response_breached,
      cs.resolution_breached
    FROM public.contacts c
    LEFT JOIN public.queues q ON q.id = c.queue_id
    LEFT JOIN public.profiles p ON p.user_id = c.assigned_to
    LEFT JOIN public.conversation_sla cs ON cs.contact_id = c.id
    LEFT JOIN public.sla_configurations cfg ON cfg.id = cs.sla_configuration_id
    LEFT JOIN LATERAL (
      SELECT entered_at FROM public.queue_positions qpx
       WHERE qpx.contact_id = c.id ORDER BY entered_at DESC LIMIT 1
    ) qp ON true
    LEFT JOIN LATERAL (
      SELECT created_at AS assigned_at FROM public.audit_log alx
       WHERE alx.entity_type = 'contact' AND alx.entity_id = c.id
         AND alx.action IN ('contact.assigned','assignment.changed')
       ORDER BY created_at DESC LIMIT 1
    ) al ON true
    WHERE COALESCE(cs.resolved_at IS NULL, true)
      AND (p_queue_id IS NULL OR c.queue_id = p_queue_id)
      AND (p_assigned_to IS NULL OR c.assigned_to = p_assigned_to)
      AND (
        p_search IS NULL
        OR c.name ILIKE '%'||p_search||'%'
        OR c.phone ILIKE '%'||p_search||'%'
      )
  ),
  enriched AS (
    SELECT b.*,
      GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(b.assigned_at, now()) - COALESCE(b.entered_queue_at, b.assigned_at, now())))::int) AS wait_seconds,
      CASE WHEN b.assigned_to IS NOT NULL
           THEN GREATEST(0, EXTRACT(EPOCH FROM (now() - COALESCE(b.assigned_at, b.entered_queue_at, now())))::int)
           ELSE 0 END AS handle_seconds,
      CASE WHEN b.first_response_at IS NOT NULL AND b.entered_queue_at IS NOT NULL
           THEN GREATEST(0, EXTRACT(EPOCH FROM (b.first_response_at - b.entered_queue_at))::int)
           ELSE NULL END AS first_response_seconds
    FROM base b
  ),
  scored AS (
    SELECT e.*,
      CASE
        WHEN COALESCE(e.first_response_breached, false) OR COALESCE(e.resolution_breached, false) THEN 'breached'
        WHEN e.first_response_at IS NULL
             AND e.wait_seconds > (e.first_response_minutes * 60 * 0.8) THEN 'at_risk'
        WHEN e.first_response_at IS NULL
             AND e.wait_seconds > (e.first_response_minutes * 60) THEN 'breached'
        ELSE 'on_track'
      END AS sla_status,
      CASE WHEN e.first_response_minutes > 0
           THEN LEAST(100, ROUND((e.wait_seconds::numeric / (e.first_response_minutes * 60)) * 100, 1))
           ELSE 0 END AS sla_progress_pct
    FROM enriched e
  )
  SELECT
    s.contact_id, s.contact_name, s.contact_phone, s.channel_type,
    s.queue_id, s.queue_name, s.queue_color,
    s.assigned_to, s.agent_name, s.priority,
    s.first_response_minutes, s.resolution_minutes,
    s.entered_queue_at, s.assigned_at, s.first_response_at, s.resolved_at,
    s.wait_seconds, s.handle_seconds, s.first_response_seconds,
    COALESCE(s.first_response_breached, false), COALESCE(s.resolution_breached, false),
    s.sla_status, s.sla_progress_pct
  FROM scored s
  WHERE (p_status IS NULL OR s.sla_status = p_status)
    AND (p_priority IS NULL OR s.priority = p_priority)
  ORDER BY
    CASE s.sla_status WHEN 'breached' THEN 0 WHEN 'at_risk' THEN 1 ELSE 2 END,
    CASE s.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
    s.wait_seconds DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_conversation_sla_panel(text, text, uuid, uuid, text, int) TO authenticated;