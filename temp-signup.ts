import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Environment variables missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Tentando criar usuário...');
  const { data, error } = await supabase.auth.signUp({
    email: 't02.promobrindes@gmail.com',
    password: 'TemporaryPassword123!',
    options: {
      data: { name: 'Usuário T02' }
    }
  });
  
  if (error) {
    console.log('RESULT: ' + JSON.stringify({ error }));
  } else {
    console.log('RESULT: ' + JSON.stringify({ success: true, user: data.user?.id }));
  }
}

run();
