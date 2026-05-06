// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

Deno.test("fn_accept_transfer atomicity test", async () => {
  const transferId = '00000000-0000-0000-0000-00000000000a'

  // Ensure the transfer is pending
  await supabase.from('conversation_transfers').update({ status: 'pending' }).eq('id', transferId)

  console.log(`Testing transfer ID: ${transferId}`)

  const operators = Array.from({ length: 30 }, (_, i) => `operator_${i}`)
  
  const results = await Promise.all(
    operators.map(op => 
      supabase.rpc('fn_test_only_accept_transfer', {
        p_transfer_id: transferId,
        p_operator_name: op
      })
    )
  )

  console.log(`First result sample: ${JSON.stringify(results[0])}`)

  const successes = results.filter(r => r.data && r.data.ok === true)
  const failures = results.filter(r => r.data && r.data.ok === false)
  const errors = results.filter(r => r.error)

  console.log(`Successes: ${successes.length}`)
  console.log(`Failures: ${failures.length}`)
  console.log(`Errors: ${errors.length}`)

  if (successes.length !== 1) {
    throw new Error(`Race condition detected! Successes: ${successes.length}. Errors sample: ${JSON.stringify(errors[0])}`)
  }
})
