import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import "https://deno.land/std@0.224.0/dotenv/load.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

Deno.test("evolution-api: disconnect should handle 500 connection closed", async () => {
  const payload = {
    action: "disconnect",
    instance: "test_instance"
  };

  const response = await fetch(`${SUPABASE_URL}/functions/v1/evolution-api`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  // We expect 200 even if upstream fails with "Connection Closed" due to our resilience fix
  assertEquals(response.status, 200);
  assertEquals(typeof data.success, "boolean");
});
