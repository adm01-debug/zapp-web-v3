import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";
import { handleCors, errorResponse, jsonResponse, requireEnv } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  // This function must only be invoked by the scheduler using the CRON_SECRET.
  // It must never be publicly accessible.
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("Authorization");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return errorResponse("Não autorizado", 401, req);
  }

  try {
    const supabase = createClient(
      requireEnv("SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false } }
    );

    // Passwords are stored hashed by Supabase; these plain-text values are
    // only used at first-run seeding and must be changed before production.
    const users = [
      { email: "admin_ti@zappweb.com", password: Deno.env.get("SEED_PASS_TI") || crypto.randomUUID(), role: "admin", department: "TI", name: "Admin TI", dept_id: "d2222222-2222-2222-2222-222222222222" },
      { email: "agent_rh@zappweb.com", password: Deno.env.get("SEED_PASS_RH") || crypto.randomUUID(), role: "agent", department: "RH", name: "Agente RH", dept_id: "d3333333-3333-3333-3333-333333333333" },
      { email: "agent_fin@zappweb.com", password: Deno.env.get("SEED_PASS_FIN") || crypto.randomUUID(), role: "agent", department: "Financeiro", name: "Agente Financeiro", dept_id: "b2a0a820-14d3-4831-8916-8067aa0888dc" },
      { email: "agent_trans@zappweb.com", password: Deno.env.get("SEED_PASS_TRANS") || crypto.randomUUID(), role: "agent", department: "Suporte", name: "Agente Transferidor", dept_id: "d4444444-4444-4444-4444-444444444444" },
    ];

    const results = [];

    for (const user of users) {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: { name: user.name }
      });

      let userId = authUser?.user?.id;

      if (authError) {
        if (authError.message.includes("already exists")) {
          const { data: profiles } = await supabase.from("profiles").select("user_id").eq("email", user.email).limit(1);
          userId = profiles?.[0]?.user_id;
        } else {
          results.push({ email: user.email, status: "error", error: authError.message });
          continue;
        }
      }

      if (!userId) {
        results.push({ email: user.email, status: "error", error: "Could not get user_id" });
        continue;
      }

      await supabase.from("profiles").upsert({
        user_id: userId,
        email: user.email,
        name: user.name,
        department: user.department,
        department_id: user.dept_id,
        role: user.role,
        is_active: true
      }, { onConflict: "user_id" });

      await supabase.from("user_roles").upsert({
        user_id: userId,
        role: user.role
      }, { onConflict: "user_id,role" });

      results.push({ email: user.email, status: "success", userId });
    }

    return jsonResponse({ results }, 200, req);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return errorResponse(msg, 500, req);
  }
});
