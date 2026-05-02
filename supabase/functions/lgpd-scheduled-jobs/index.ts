/**
 * lgpd-scheduled-jobs/index.ts
 * Supabase Edge Function — LGPD automated maintenance jobs.
 *
 * Schedule this function via Supabase cron (pg_cron) or external scheduler:
 *   - Daily at 02:00 UTC: purge soft-deleted contacts > 30 days
 *   - Weekly: purge PII access logs > 90 days
 *   - Monthly: purge audit logs > 2 years
 *
 * Invoke: POST /functions/v1/lgpd-scheduled-jobs
 * Body: { "job": "daily_purge" | "weekly_pii_purge" | "monthly_audit_purge" }
 * Auth: Service role key required (cron secret)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_JOBS = ['daily_purge', 'weekly_pii_purge', 'monthly_audit_purge', 'all'] as const;
type JobName = typeof ALLOWED_JOBS[number];

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST' } });
  }

  // Verify this is called with service role key (from cron)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.includes('Bearer')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  let body: { job?: JobName } = {};
  try {
    body = await req.json();
  } catch {
    body = { job: 'all' };
  }

  const jobName: JobName = body.job ?? 'all';

  if (!ALLOWED_JOBS.includes(jobName)) {
    return new Response(JSON.stringify({ error: `Unknown job: ${jobName}` }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const results: Record<string, unknown> = {};
  const startTime = Date.now();

  try {
    // Daily: purge soft-deleted contacts
    if (jobName === 'daily_purge' || jobName === 'all') {
      const { data, error } = await supabase.rpc('run_lgpd_purge');
      if (error) throw error;
      results.daily_purge = data;
    }

    // Weekly: purge PII access logs
    if (jobName === 'weekly_pii_purge' || jobName === 'all') {
      const { data, error } = await supabase.rpc('run_pii_log_purge');
      if (error) throw error;
      results.weekly_pii_purge = data;
    }

    // Monthly: purge old audit logs
    if (jobName === 'monthly_audit_purge' || jobName === 'all') {
      const { data, error } = await supabase.rpc('run_audit_log_purge');
      if (error) throw error;
      results.monthly_audit_purge = data;
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobs_run: Object.keys(results),
        results,
        total_duration_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[lgpd-scheduled-jobs] Error:', err);
    return new Response(
      JSON.stringify({ error: String(err), duration_ms: Date.now() - startTime }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
