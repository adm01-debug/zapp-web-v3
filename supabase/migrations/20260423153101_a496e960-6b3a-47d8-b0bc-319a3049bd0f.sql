-- Tabela de incidentes da Evolution API (HMAC inválido + 401/403)
CREATE TABLE IF NOT EXISTS public.evolution_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name text NOT NULL,
  incident_type text NOT NULL CHECK (incident_type IN ('invalid_signature', 'auth_401', 'auth_403')),
  http_status integer,
  source text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evolution_incidents_instance_created
  ON public.evolution_incidents (instance_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evolution_incidents_type_created
  ON public.evolution_incidents (incident_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_evolution_incidents_created
  ON public.evolution_incidents (created_at DESC);

ALTER TABLE public.evolution_incidents ENABLE ROW LEVEL SECURITY;

-- Apenas admin/supervisor pode ler
CREATE POLICY "Admins/supervisors can view incidents"
  ON public.evolution_incidents
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_supervisor(auth.uid()));

-- Apenas admin/supervisor (ou service_role) pode inserir manualmente
CREATE POLICY "Admins/supervisors can insert incidents"
  ON public.evolution_incidents
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_supervisor(auth.uid()));

-- Função de cleanup (>30 dias)
CREATE OR REPLACE FUNCTION public.cleanup_old_evolution_incidents()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.evolution_incidents
  WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;