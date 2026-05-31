import { handleCors, errorResponse, jsonResponse, requireEnv, requireUser, Logger } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("get-mapbox-token", req);

  try {
    await requireUser(req, requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"));
    const mapboxToken = requireEnv("MAPBOX_PUBLIC_TOKEN");
    log.done(200);
    return jsonResponse({ token: mapboxToken }, 200, req);
  } catch (err) {
    const e = err as { message?: string; status?: number };
    if (e.status === 401) return errorResponse("Não autorizado", 401, req);
    const msg = e.message || "Internal server error";
    log.error("Unhandled error", { error: msg });
    return errorResponse(msg, 500, req);
  }
});
