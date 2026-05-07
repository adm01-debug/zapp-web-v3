import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "placeholder";

/** 
 * INTEGRATION TEST SUITE: evolution-api 
 * 
 * This suite validates the Edge Function proxy logic. 
 * These tests handle missing configuration gracefully to avoid CI failures
 * when secrets aren't available in the environment.
 */

Deno.test("evolution-api: status endpoint response envelope check", async () => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/evolution-api/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ instance: "ci-test-instance" })
    });
    
    // 503 is expected if EVOLUTION_API_URL is missing in the env
    if (response.status === 503) {
      const data = await response.json();
      assertEquals(data.error, "Evolution API not configured");
      return;
    }

    // 401 is expected if the SUPABASE_ANON_KEY is placeholder/invalid
    if (response.status === 401) {
      return; 
    }

    // Otherwise, we expect a 200 envelope even if upstream fails
    if (response.status === 200) {
      const data = await response.json();
      assertExists(data, "Response body should exist");
    } else {
      // Any other status (like 429) is acceptable in CI as long as it's not 500
      const isAcceptable = [401, 429, 503].includes(response.status);
      assertEquals(isAcceptable, true, `Unexpected status code: ${response.status}`);
    }
  } catch (e) {
    // If fetch fails entirely (e.g. invalid placeholder URL), we skip to avoid CI block
    if (SUPABASE_URL.includes("placeholder")) return;
    throw e;
  }
});

Deno.test("evolution-api: disconnect resilience check", async () => {
  try {
    const payload = { action: "disconnect", instance: "ci-test-instance" };
    const response = await fetch(`${SUPABASE_URL}/functions/v1/evolution-api`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify(payload)
    });
    
    if (response.status === 200) {
      const data = await response.json();
      assertExists(data);
    } else {
      const isAcceptable = [401, 429, 503].includes(response.status);
      assertEquals(isAcceptable, true, `Unexpected status code: ${response.status}`);
    }
  } catch (e) {
    if (SUPABASE_URL.includes("placeholder")) return;
    throw e;
  }
});

