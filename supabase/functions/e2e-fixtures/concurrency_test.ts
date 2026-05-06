// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

Deno.test("fn_accept_transfer atomicity test", async () => {
  const transferId = '00000000-0000-0000-0000-00000000000a'

  console.log(`Testing transfer ID: ${transferId}`)

  // 1. Simulate 30 concurrent accept calls
  const operators = Array.from({ length: 30 }, (_, i) => `operator_${i}`)
  
  const results = await Promise.all(
    operators.map(op => 
      supabase.rpc('fn_test_only_accept_transfer', {
        p_transfer_id: transferId,
        p_operator_name: op
      })
    )
  )

  const successes = results.filter(r => r.data?.ok === true)
  const failures = results.filter(r => r.data?.ok === false)

  console.log(`Successes: ${successes.length}`)
  console.log(`Failures: ${failures.length}`)

  // 2. Assertions
  if (successes.length !== 1) {
    throw new Error(`Race condition detected! Successes: ${successes.length}`)
  }
  
  const { data: finalTransfer } = await supabase
    .from('conversation_transfers')
    .select('target_operator, status')
    .eq('id', transferId)
    .single()
    
  if (finalTransfer.status !== 'accepted') {
    throw new Error(`Transfer status should be accepted, but is ${finalTransfer.status}`)
  }
  
  console.log(`Test passed. Final Operator: ${finalTransfer.target_operator}`)
})
