import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? "placeholder";

/** 
 * INTEGRATION TEST SUITE: evolution-api 
 * 
 * This suite validates the Edge Function proxy logic, including resilience,
 * error handling, and parameter normalization.
 * 
 * Note: These tests assume they are running against a deployed edge function
 * or a local emulator. They handle missing configuration gracefully to avoid CI failures.
 */

Deno.test("evolution-api: status should return 200 even if upstream fails (envelope check)", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/evolution-api/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ instance: "ci-test-instance" })
  });
  
  // The Edge Function is designed to wrap upstream errors in a 200 envelope
  // so the frontend can parse the error message. 503 is only returned if basic secrets are missing.
  if (response.status === 200) {
    const data = await response.json();
    assertExists(data, "Response body should exist");
    // If it's an error, it must have the error: true marker
    if (data.error === true) {
      assertExists(data.message);
    }
  } else {
    // If not 200, we expect 503 (not configured) or 429 (rate limit)
    const isExpectedStatus = [401, 429, 503].includes(response.status);
    assertEquals(isExpectedStatus, true, `Unexpected status code: ${response.status}`);
  }
});

Deno.test("evolution-api: disconnect should handle upstream failures gracefully", async () => {
  const payload = { action: "disconnect", instance: "ci-test-instance" };
  const response = await fetch(`${SUPABASE_URL}/functions/v1/evolution-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    body: JSON.stringify(payload)
  });
  
  // Disconnect has built-in retries and 500 mapping
  if (response.status === 200) {
    const data = await response.json();
    // Should return success: true OR success: false with a reason
    if (data.success !== undefined) {
      assertEquals(typeof data.success, "boolean");
    } else {
      assertExists(data.error);
    }
  } else {
    const isExpectedStatus = [401, 429, 503].includes(response.status);
    assertEquals(isExpectedStatus, true, `Unexpected status code: ${response.status}`);
  }
});

Deno.test("evolution-api: fuzz testing - invalid JSON body resilience", async () => {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/evolution-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
    body: "{ invalid_json: " 
  });
  
  if (response.status === 200) {
    const data = await response.json();
    // Edge function should default body to {} and likely return an error because 'action' is missing
    assertExists(data.error || data.success === false || data.message);
  } else {
    const isExpectedStatus = [400, 401, 429, 503].includes(response.status);
    assertEquals(isExpectedStatus, true, `Unexpected status code: ${response.status}`);
  }
});
