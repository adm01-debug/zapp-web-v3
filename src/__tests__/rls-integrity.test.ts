import { test, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// These tests simulate actual database calls using the ANON key
// To verify that RLS is actually denying access even if policies exist.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'fake-key';

test('RLS: Cross-organization data isolation (Negative Test)', async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Attempt to select from sensitive tables without a session
  // Should return empty array or error depending on policy
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .limit(1);

  // Without a session, anon user should see nothing in a strictly RLS-enabled table
  expect(data).toHaveLength(0);
  if (error) {
    console.log('Successfully blocked unauthorized access:', error.message);
  }
});

test('RLS: Public profiles access (Positive Test)', async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Profiles are often public or have a public policy
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  // If this fails, it might be because there is no data or policy is strict
  // But for audit purposes, we want to see if the policy is working as intended.
  expect(error).toBeNull();
});
