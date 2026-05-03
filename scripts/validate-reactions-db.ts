import { supabase } from './src/integrations/supabase/client';

async function validateDatabase() {
  console.log('Validating database tables for reactions...');
  
  const tables = ['message_reactions', 'team_message_reactions'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('count').limit(1);
    if (error && error.code !== 'PGRST116') { // PGRST116 is 'no rows', which is fine
      console.error(`❌ Table ${table} check failed:`, error.message);
    } else {
      console.log(`✅ Table ${table} exists.`);
    }
  }

  // Check for indexes (this is harder via client, usually done via SQL)
  console.log('Reactions database validation complete.');
}

validateDatabase();
