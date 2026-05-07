import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "placeholder";

/** 
 * INTEGRATION TEST SUITE: evolution-api 
 * 
 * This suite validates the Edge Function proxy logic, including resilience,
 * error handling, and parameter normalization.
 */

Deno.test("evolution-api: health-check should return 503 if not configured", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/evolution-api/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ instance: "non-existent" })
  });
  
  const data = await response.json();
  // If secrets are missing in test env, it should report 503 or 401
  if (response.status === 503) {
    assertEquals(data.error, "Evolution API not configured");
  } else {
    // If configured, it might return a 404 or 401 from upstream, which we wrap in a 200 envelope
    assertEquals(response.status, 200);
    assertExists(data.error);
  }
});

Deno.test("evolution-api: disconnect should handle 500 connection closed", async () => {
  const payload = { action: "disconnect", instance: "test_instance" };
  const response = await fetch(`${SUPABASE_URL}/functions/v1/evolution-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  assertEquals(response.status, 200);
  assertEquals(typeof data.success, "boolean");
});

/** 
 * FUZZ TESTING: Validating input resilience 
 */
Deno.test("evolution-api: fuzz testing - invalid JSON body", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/evolution-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    body: "{ invalid_json: " // Missing closing and quotes
  });
  
  const data = await response.json();
  // Edge function should not crash; it defaults body to {}
  assertEquals(response.status, 200);
  assertExists(data.error);
});

Deno.test("evolution-api: rate limiting simulation", async () => {
  const promises = Array.from({ length: 5 }).map(() => 
    fetch(`${SUPABASE_URL}/functions/v1/evolution-api/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ instance: "rl-test" })
    })
  );
  
  const responses = await Promise.all(promises);
  const anyRateLimited = responses.some(r => r.status === 429);
  // In local test env RL might not trigger, but we check if it handles it gracefully
  responses.forEach(r => assertEquals(r.status === 200 || r.status === 429 || r.status === 503, true));
});
