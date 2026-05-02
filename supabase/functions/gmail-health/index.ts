import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// NOTE: Gmail health telemetry (cache TTL, recent failures, schema validation)
// is tracked in-memory inside the browser via `gmailHealthService` and
// `safeClient`. Edge functions run in an isolated Deno runtime and cannot
// share that in-memory state, so this endpoint exposes a minimal contract
// that the Status screen can call as a connectivity probe / placeholder.
// The real-time data continues to come from the client-side service.

interface HealthResponse {
  status: "healthy" | "degraded" | "error" | "unknown";
  source: "edge";
  timestamp: string;
  message: string;
  failuresResult: {
    items: never[];
    total: number;
    page: number;
    pageSize: number;
  };
}

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10", 10);

    if (req.method === "POST" && action === "revalidate") {
      return new Response(
        JSON.stringify({
          success: true,
          message:
            "Revalidação deve ser executada via gmailHealthService no client.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body: HealthResponse = {
      status: "unknown",
      source: "edge",
      timestamp: new Date().toISOString(),
      message:
        "Telemetria detalhada disponível via gmailHealthService no client.",
      failuresResult: {
        items: [],
        total: 0,
        page,
        pageSize,
      },
    };

    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
