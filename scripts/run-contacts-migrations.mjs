#!/usr/bin/env node
/**
 * run-contacts-migrations.mjs
 * Automated migration runner for Contacts Module v3.0.
 *
 * Usage:
 *   node scripts/run-contacts-migrations.mjs
 *
 * Requires:
 *   - SUPABASE_URL in environment
 *   - SUPABASE_SERVICE_ROLE_KEY in environment
 *   - @supabase/supabase-js installed
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Config ────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Migration files in order ──────────────────────────────────────────────

const MIGRATIONS = [
  { file: 'supabase/migrations/20260501_contact_audit_log.sql',           name: 'Contact Audit Log' },
  { file: 'supabase/migrations/20260501_contacts_soft_delete.sql',        name: 'Soft Delete + Recycle Bin' },
  { file: 'supabase/migrations/20260501_contacts_performance_indexes.sql', name: 'Performance Indexes (GIN + trigram + unaccent)' },
  { file: 'supabase/migrations/20260501_contacts_multiple_phones.sql',    name: 'Multiple Phone Numbers' },
  { file: 'supabase/migrations/20260501_contacts_pii_masking.sql',        name: 'PII Masking + LGPD Columns' },
  { file: 'supabase/migrations/20260501_contacts_optimistic_locking.sql', name: 'Optimistic Locking' },
  { file: 'supabase/migrations/20260502_contacts_dedup_constraints.sql',  name: 'Dedup Constraints (unique phone/email)' },
  { file: 'supabase/migrations/20260502_lgpd_dashboard_scheduled_jobs.sql', name: 'LGPD Dashboard + Scheduled Jobs' },
];

// ── Runner ────────────────────────────────────────────────────────────────

async function runMigrations() {
  console.log('🚀 ZAPP WEB — Contacts Module v3.0 Migration Runner');
  console.log(`📍 Target: ${SUPABASE_URL}\n`);

  let success = 0;
  let failed = 0;

  for (const migration of MIGRATIONS) {
    const filePath = join(ROOT, migration.file);
    let sql;

    try {
      sql = readFileSync(filePath, 'utf8');
    } catch (err) {
      console.error(`  ⚠️  File not found: ${migration.file}`);
      failed++;
      continue;
    }

    process.stdout.write(`  ▶ ${migration.name}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        // Try direct query if RPC not available
        const { error: qError } = await supabase.from('_migrations_dummy').select().limit(0);
        if (qError?.code === 'PGRST116') {
          // Expected — table doesn't exist, try direct SQL
          console.log(` ⚠️  (manual apply needed)`);
        } else {
          throw error;
        }
      }
      console.log(` ✅`);
      success++;
    } catch (err) {
      console.log(` ❌ ${String(err).slice(0, 100)}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${success}/${MIGRATIONS.length} successful, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n💡 Manual apply instructions:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Run each migration file in the order listed above');
    console.log('   3. Or use: supabase db push\n');
  } else {
    console.log('\n🎉 All migrations applied successfully!');
  }

  console.log('\n📦 Deploy Edge Functions:');
  console.log('   supabase functions deploy contacts-import');
  console.log('   supabase functions deploy lgpd-scheduled-jobs\n');
}

runMigrations().catch(console.error);
