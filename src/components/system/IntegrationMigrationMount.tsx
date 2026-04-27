import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateWhatsAppModeCache } from "@/lib/whatsappAdapter";

/**
 * Roda `rpc_migrate_whatsapp_integration` uma vez por sessão.
 * É idempotente no servidor — re-execuções são seguras e refletem o estado atual.
 * O resultado é cacheado em sessionStorage para evitar chamada redundante a cada
 * navegação SPA.
 */
const SESSION_KEY = "whatsapp_integration_migrated";

export function IntegrationMigrationMount() {
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    if (sessionStorage.getItem(SESSION_KEY) === "1") return;

    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) return; // só roda se usuário autenticado
        // deno-lint-ignore no-explicit-any
        const { data, error } = await supabase.rpc("rpc_migrate_whatsapp_integration" as any);
        if (error) {
          console.warn("[integration-migration] failed:", error.message);
          return;
        }
        sessionStorage.setItem(SESSION_KEY, "1");
        invalidateWhatsAppModeCache();
        if (import.meta.env.DEV) {
          console.info("[integration-migration] result:", data);
        }
      } catch (e) {
        console.warn("[integration-migration] error:", e);
      }
    })();
  }, []);

  return null;
}
