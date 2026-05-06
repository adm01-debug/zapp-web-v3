// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const supabaseUrl = "https://allrjhkpuscmgbsnmjlv.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbHJqaGtwdXNjbWdic25tamx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDc3NDQsImV4cCI6MjA4MTMyMzc0NH0.7S2yN87sjm22J9DXC7Njo7UaXQ2tHk6XMJheNVqHA74"
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

  const successes = results.filter(r => r.data && r.data.ok === true)
  const failures = results.filter(r => r.data && r.data.ok === false)
  const errors = results.filter(r => r.error)

  console.log(`Successes: ${successes.length}`)
  console.log(`Failures: ${failures.length}`)
  console.log(`Errors: ${errors.length}`)

  if (successes.length !== 1) {
    throw new Error(`Race condition detected! Successes: ${successes.length}. Error sample: ${JSON.stringify(errors[0])}`)
  }
  
  console.log("Test Passed: Atomicity confirmed.")
})
