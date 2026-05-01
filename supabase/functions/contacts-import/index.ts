/**
 * contacts-import/index.ts
 * Supabase Edge Function: Process large CSV contact imports in chunks.
 *
 * Features:
 * - Accepts parsed contact rows as JSON (from ContactImportDialog.tsx)
 * - Processes in chunks of 250 to avoid Supabase timeout
 * - Detects duplicates by normalized phone/email
 * - Reports progress per chunk via structured response
 * - LGPD: marks consent_channel as 'import'
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CHUNK_SIZE = 250;

// ── Types ──────────────────────────────────────────────────────────────────

interface ImportContactRow {
  name:    string;
  phone?:  string;
  email?:  string;
  company?:string;
  tags?:   string;   // comma-separated
  notes?:  string;
}

interface ImportResult {
  total:     number;
  inserted:  number;
  updated:   number;
  skipped:   number;
  errors:    Array<{ row: number; reason: string }>;
  duration_ms: number;
}

// ── Phone normalization ────────────────────────────────────────────────────

function normalizePhone(phone: string): string {
  if (!phone) return '';
  let digits = phone.replace(/[^0-9]/g, '');

  // Remove country code 55 if present (Brazilian numbers)
  if (digits.startsWith('55') && digits.length >= 12) {
    digits = digits.slice(2);
  }

  // Add 9th digit if 10-digit number (pre-2012 format)
  if (digits.length === 10 && digits[2] !== '9') {
    digits = digits.slice(0, 2) + '9' + digits.slice(2);
  }

  return digits;
}

function sanitizeText(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/<[^>]*>/g, '') // strip HTML
    .trim()
    .slice(0, 500);           // cap length
}

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Authenticate
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl  = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase     = createClient(supabaseUrl, supabaseKey);
  const userSupabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });

  // Get authenticated user
  const { data: { user }, error: authError } = await userSupabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Get user's workspace
  const { data: profile } = await supabase
    .from('profiles')
    .select('workspace_id')
    .eq('id', user.id)
    .single();

  if (!profile?.workspace_id) {
    return new Response(JSON.stringify({ error: 'Workspace not found' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const workspaceId = profile.workspace_id;

  // Parse body
  let rows: ImportContactRow[];
  try {
    const body = await req.json();
    rows = body.rows;
    if (!Array.isArray(rows)) throw new Error('rows must be an array');
    if (rows.length > 50_000) throw new Error('Maximum 50,000 rows per import');
  } catch (err) {
    return new Response(JSON.stringify({ error: `Invalid body: ${err}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const startTime = Date.now();
  const result: ImportResult = {
    total: rows.length, inserted: 0, updated: 0, skipped: 0, errors: [],
  };

  // Process in chunks
  for (let chunkStart = 0; chunkStart < rows.length; chunkStart += CHUNK_SIZE) {
    const chunk = rows.slice(chunkStart, chunkStart + CHUNK_SIZE);

    for (let i = 0; i < chunk.length; i++) {
      const rowIndex = chunkStart + i;
      const raw = chunk[i];

      // Validate: must have name or phone
      const name  = sanitizeText(raw.name);
      const phone = normalizePhone(sanitizeText(raw.phone));
      const email = sanitizeText(raw.email)?.toLowerCase();

      if (!name && !phone && !email) {
        result.errors.push({ row: rowIndex + 2, reason: 'Linha sem nome, telefone ou email' });
        result.skipped++;
        continue;
      }

      try {
        // Check for existing contact by phone or email (dedup)
        let existingId: string | null = null;

        if (phone) {
          const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('workspace_id', workspaceId)
            .is('deleted_at', null)
            .or(`phone.eq.${phone},phone.eq.+55${phone}`)
            .maybeSingle();
          existingId = existing?.id ?? null;
        }

        if (!existingId && email) {
          const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('workspace_id', workspaceId)
            .eq('email', email)
            .is('deleted_at', null)
            .maybeSingle();
          existingId = existing?.id ?? null;
        }

        const contactData = {
          name:    name || 'Sem nome',
          phone:   phone || null,
          email:   email || null,
          company: sanitizeText(raw.company) || null,
          tags:    raw.tags ? raw.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
          notes:   sanitizeText(raw.notes) || null,
          workspace_id: workspaceId,
          lgpd_consent_channel: 'import',
          updated_at: new Date().toISOString(),
        };

        if (existingId) {
          // Update existing (upsert)
          await supabase.from('contacts').update(contactData).eq('id', existingId);
          result.updated++;
        } else {
          // Insert new
          await supabase.from('contacts').insert({
            ...contactData,
            created_at: new Date().toISOString(),
          });
          result.inserted++;
        }
      } catch (err) {
        result.errors.push({ row: rowIndex + 2, reason: String(err) });
        result.skipped++;
      }
    }

    // Small yield between chunks to avoid worker timeout
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  result.duration_ms = Date.now() - startTime;

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
});
