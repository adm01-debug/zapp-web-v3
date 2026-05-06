
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

Deno.test("fn_accept_transfer atomicity test", async () => {
  // 1. Create a dummy transfer
  const { data: transfer, error: createError } = await supabase
    .from('conversation_transfers')
    .insert({
      target_instance: 'test_instance',
      status: 'pending',
      remote_jid: 'test_concurrency@s.whatsapp.net',
      reason: 'Testing concurrency'
    })
    .select()
    .single()

  if (createError) throw createError
  
  // Ensure we have an instance member to pass the RLS check in the function
  // (The function has a check: target_instance IN (SELECT instance_name FROM public.instance_members WHERE user_id = auth.uid()))
  // Wait, since we are using service role, we might need to mock auth.uid() or adjust the function.
  // The function uses auth.uid(). In a real test, we'd sign in as a user.
  
  console.log(`Testing transfer ID: ${transfer.id}`)

  // 2. Simulate 50 concurrent accept calls
  const operators = Array.from({ length: 50 }, (_, i) => `operator_${i}`)
  
  const results = await Promise.all(
    operators.map(op => 
      supabase.rpc('fn_accept_transfer', {
        p_transfer_id: transfer.id,
        p_operator_name: op
      })
    )
  )

  const successes = results.filter(r => r.data?.ok === true)
  const failures = results.filter(r => r.data?.ok === false)

  console.log(`Successes: ${successes.length}`)
  console.log(`Failures: ${failures.length}`)

  // 3. Assert only ONE succeeded
  if (successes.length !== 1) {
    throw new Error(`Race condition detected! Successes: ${successes.length}`)
  }
  
  // 4. Verify the final operator
  const { data: finalTransfer } = await supabase
    .from('conversation_transfers')
    .select('target_operator, status')
    .eq('id', transfer.id)
    .single()
    
  console.log(`Final status: ${finalTransfer.status}, Operator: ${finalTransfer.target_operator}`)
  
  if (finalTransfer.status !== 'accepted') {
    throw new Error(`Transfer status should be accepted, but is ${finalTransfer.status}`)
  }
})
