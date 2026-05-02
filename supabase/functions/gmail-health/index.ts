import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.42.0/cors";

/**
 * Edge Function para monitoramento centralizado da saúde do Gmail.
 * Este endpoint retorna o status consolidado, métricas e histórico de falhas persistidos no banco.
 */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Ação: Revalidar (apenas limpa o que for persistido se houver lógica no banco, 
    // mas o cache real reside no client).
    if (req.method === "POST" && action === "revalidate") {
      // No banco, poderíamos deletar logs antigos ou marcar como resolvidos
      await supabase
        .from("gmail_health_logs")
        .update({ status: "resolved" })
        .eq("status", "error");

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar sumário de saúde usando RPC persistido
    const { data: summary, error: summaryError } = await supabase.rpc(
      "rpc_get_gmail_health_summary",
      { p_window_minutes: 60 },
    );

    if (summaryError) throw summaryError;

    // Buscar histórico de falhas persistido
    const requestId = url.searchParams.get("requestId");
    const operation = url.searchParams.get("operation");
    const resource = url.searchParams.get("resource");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10", 10);

    let query = supabase
      .from("gmail_health_logs")
      .select("*", { count: "exact" })
      .eq("is_failure", true)
      .order("timestamp", { ascending: false });

    if (requestId) query = query.ilike("request_id", `%${requestId}%`);
    if (operation) query = query.eq("operation", operation);
    if (resource) query = query.ilike("resource", `%${resource}%`);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data: failures, count: total, error: listError } = await query.range(
      from,
      to,
    );

    if (listError) throw listError;

    return new Response(
      JSON.stringify({
        ...summary,
        source: "edge_api",
        timestamp: new Date().toISOString(),
        failuresResult: {
          items: failures || [],
          total: total || 0,
          page,
          pageSize,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[gmail-health] Erro crítico:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        status: "error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

