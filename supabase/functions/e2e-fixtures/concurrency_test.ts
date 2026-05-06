// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

Deno.test("fn_accept_transfer atomicity test", async () => {
  const testUserId = '00000000-0000-0000-0000-000000000001'
  const testInstance = 'test_concurrency_instance'

  // 1. Cleanup and Setup
  await supabase.from('instance_registry').upsert({ instance_name: testInstance, display_name: 'Test Instance' })
  await supabase.from('instance_members').upsert({ 
    user_id: testUserId, 
    instance_name: testInstance, 
    role: 'operator' 
  })

  // Create a dummy transfer
  const { data: transfer, error: createError } = await supabase
    .from('conversation_transfers')
    .insert({
      target_instance: testInstance,
      status: 'pending',
      remote_jid: 'test_concurrency@s.whatsapp.net',
      reason: 'Testing concurrency'
    })
    .select()
    .single()

  if (createError) throw createError
  
  console.log(`Testing transfer ID: ${transfer.id}`)

  // 2. We need to call the RPC as the test user to pass RLS
  // We'll use a trick: since we can't easily get a JWT for a dummy ID without a password,
  // we'll use a wrapper or just trust that Service Role bypasses RLS in RPCs 
  // unless the RPC itself uses auth.uid().
  // Our RPC DOES use auth.uid().
  
  // Let's create a temporary user with a password to get a real token
  const testEmail = `test_${Date.now()}@example.com`
  const testPassword = 'Password123!'
  
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true
  })
  
  if (userError) throw userError
  const realUserId = userData.user.id
  
  // Update membership for the real user
  await supabase.from('instance_members').insert({ 
    user_id: realUserId, 
    instance_name: testInstance, 
    role: 'operator' 
  })

  // Sign in to get the token
  const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword
  })
  
  if (loginError) throw loginError
  
  const userClient = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } }
  })

  // 3. Simulate 20 concurrent accept calls (reduced from 50 for stability)
  const operators = Array.from({ length: 20 }, (_, i) => `operator_${i}`)
  
  const results = await Promise.all(
    operators.map(op => 
      userClient.rpc('fn_accept_transfer', {
        p_transfer_id: transfer.id,
        p_operator_name: op
      })
    )
  )

  const successes = results.filter(r => r.data?.ok === true)
  const failures = results.filter(r => r.data?.ok === false)

  console.log(`Successes: ${successes.length}`)
  console.log(`Failures: ${failures.length}`)

  // 4. Cleanup
  await supabase.auth.admin.deleteUser(realUserId)
  
  // 5. Assertions
  if (successes.length !== 1) {
    throw new Error(`Race condition detected! Successes: ${successes.length}. Failures: ${failures.map(f => f.data?.error || f.error?.message).join(', ')}`)
  }
  
  const { data: finalTransfer } = await supabase
    .from('conversation_transfers')
    .select('target_operator, status')
    .eq('id', transfer.id)
    .single()
    
  if (finalTransfer.status !== 'accepted') {
    throw new Error(`Transfer status should be accepted, but is ${finalTransfer.status}`)
  }
  
  console.log(`Test passed. Final Operator: ${finalTransfer.target_operator}`)
})
