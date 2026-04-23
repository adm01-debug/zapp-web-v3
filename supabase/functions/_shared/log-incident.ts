// Helper compartilhado para registrar incidentes da Evolution API.
// Usa SERVICE_ROLE para bypassar RLS (a tabela só permite admin/supervisor via API).
// Falhas são engolidas silenciosamente — nunca quebram o fluxo principal.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type IncidentType = "invalid_signature" | "auth_401" | "auth_403";

export interface IncidentInput {
  instanceName: string;
  incidentType: IncidentType;
  httpStatus?: number | null;
  source: string;
  details?: Record<string, unknown>;
}

let cachedClient: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (cachedClient) return cachedClient;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export async function logEvolutionIncident(input: IncidentInput): Promise<void> {
  try {
    const client = getClient();
    if (!client) return;
    await client.from("evolution_incidents").insert({
      instance_name: input.instanceName,
      incident_type: input.incidentType,
      http_status: input.httpStatus ?? null,
      source: input.source,
      details: input.details ?? {},
    });
  } catch (err) {
    console.error("[log-incident] silent failure:", err instanceof Error ? err.message : err);
  }
}
