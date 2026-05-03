import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://allrjhkpuscmgbsnmjlv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsbHJqaGtwdXNjbWdic25tamx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDc3NDQsImV4cCI6MjA4MTMyMzc0NH0.7S2yN87sjm22J9DXC7Njo7UaXQ2tHk6XMJheNVqHA74'
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const email = 'ti@promobrindes.com.br'
  const password = 'Dev@Brindes2026!'
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: 'TI Dev', role: 'dev' }
    }
  })
  if (error) {
    console.log(JSON.stringify({ error: error.message }));
  } else {
    console.log(JSON.stringify({ data }));
  }
}
run()
