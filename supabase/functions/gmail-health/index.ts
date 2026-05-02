import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    if (req.method === "POST" && action === "revalidate") {
      // Registrar um job de revalidação no banco
      const { data: job, error: jobErr } = await supabase
        .from("gmail_revalidation_jobs")
        .insert([{ status: "pending" }])
        .select()
        .single();

      if (jobErr) throw jobErr;

      return new Response(JSON.stringify({ 
        success: true, 
        jobId: job.id,
        message: "Job de revalidação agendado." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar saúde compartilhada da tabela gmail_health_summary
    const { data: summary, error: summaryError } = await supabase
      .from("gmail_health_summary")
      .select("*")
      .eq("id", "current")
      .single();

    // Buscar falhas recentes da tabela gmail_health_logs
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10", 10);
    
    const { data: failures, count: total, error: listError } = await supabase
      .from("gmail_health_logs")
      .select("*", { count: "exact" })
      .eq("is_failure", true)
      .order("timestamp", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const healthStatus = summary || { 
      status: "unknown", 
      last_validation: null, 
      failure_count_60m: 0 
    };

    return new Response(
      JSON.stringify({
        status: healthStatus.status,
        last_validation: healthStatus.last_validation,
        failure_count_window: healthStatus.failure_count_60m,
        source: "edge_shared_storage",
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
    console.error("[gmail-health] Erro:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});


