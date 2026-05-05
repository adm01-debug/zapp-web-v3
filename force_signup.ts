import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseServiceKey) {
  console.log(JSON.stringify({ error: 'Missing service role key' }));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function run() {
  const email = 'ti_dev@promobrindes.com.br' // New email to avoid "already registered"
  const password = 'Dev@Brindes2026!'
  
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: 'TI Dev 10/10', role: 'admin' }
  })
  
  if (error) {
    console.log(JSON.stringify({ error: error.message }));
  } else {
    // Also assign role if user_roles table exists
    try {
      await supabase.from('user_roles').insert({ user_id: data.user.id, role: 'admin' });
    } catch (e) {}
    
    console.log(JSON.stringify({ success: true, email }));
  }
}
run()
