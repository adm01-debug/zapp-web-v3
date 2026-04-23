// Lista incidentes da Evolution API (HMAC inválido + 401/403).
// Admin/supervisor only. Aceita filtros: instance, hours, type.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validar usuário e permissão via cliente do usuário (RLS aplica)
    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Checa role
    const { data: isAdminData } = await admin.rpc("is_admin_or_supervisor", {
      _user_id: userData.user.id,
    });
    if (!isAdminData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parâmetros
    const reqUrl = new URL(req.url);
    const instance = reqUrl.searchParams.get("instance");
    const hoursRaw = parseInt(reqUrl.searchParams.get("hours") || "24", 10);
    const hours = Math.min(Math.max(isNaN(hoursRaw) ? 24 : hoursRaw, 1), 24 * 7);
    const type = reqUrl.searchParams.get("type"); // invalid_signature | auth_401 | auth_403
    const limit = Math.min(parseInt(reqUrl.searchParams.get("limit") || "50", 10) || 50, 200);

    const sinceIso = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const prevSinceIso = new Date(Date.now() - 2 * hours * 3600 * 1000).toISOString();

    // Lista (com filtros)
    let q = admin
      .from("evolution_incidents")
      .select("id, instance_name, incident_type, http_status, source, details, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (instance) q = q.eq("instance_name", instance);
    if (type) q = q.eq("incident_type", type);

    const { data: items, error: itemsErr } = await q;
    if (itemsErr) {
      return new Response(JSON.stringify({ error: itemsErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Agregados na janela atual e anterior (para variação)
    const aggregate = async (fromIso: string, toIso?: string) => {
      let aq = admin
        .from("evolution_incidents")
        .select("instance_name, incident_type", { count: "exact" })
        .gte("created_at", fromIso);
      if (toIso) aq = aq.lt("created_at", toIso);
      if (instance) aq = aq.eq("instance_name", instance);
      const { data } = await aq;
      const byType: Record<string, number> = { invalid_signature: 0, auth_401: 0, auth_403: 0 };
      const byInstance: Record<string, number> = {};
      for (const row of data ?? []) {
        const r = row as { instance_name: string; incident_type: string };
        byType[r.incident_type] = (byType[r.incident_type] ?? 0) + 1;
        byInstance[r.instance_name] = (byInstance[r.instance_name] ?? 0) + 1;
      }
      return { total: (data ?? []).length, byType, byInstance };
    };

    const current = await aggregate(sinceIso);
    const previous = await aggregate(prevSinceIso, sinceIso);

    return new Response(
      JSON.stringify({
        windowHours: hours,
        items: items ?? [],
        summary: {
          current,
          previous,
        },
        generatedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "internal" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
