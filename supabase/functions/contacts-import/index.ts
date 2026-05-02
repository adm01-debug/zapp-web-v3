/**
 * contacts-import/index.ts — v2.0
 * Supabase Edge Function — bulk CSV contact import.
 * Processes up to 50,000 contacts in 250-row chunks.
 * Features: BR phone normalization, email dedup, XSS sanitization.
 *
 * POST /functions/v1/contacts-import
 * Body: { rows: ContactImportRow[], workspace_id: string }
 * Returns: { inserted, updated, skipped, errors[], total_processed, duration_ms }
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CHUNK_SIZE = 250;
const MAX_ROWS   = 50_000;

interface ContactImportRow {
  name:    string;
  phone?:  string;
  email?:  string;
  company?:string;
  tags?:   string;
  notes?:  string;
  channel?:string;
}

// BR phone normalization (no DOM in Deno — pure string ops)
function normalizeBR(raw: string): string | null {
  if (!raw) return null;
  let d = raw.replace(/@c\.us$/, '').replace(/@s\.whatsapp\.net$/, '').replace(/[^0-9]/g, '');
  if (!d) return null;
  // Strip +55 or 55 country code
  if (d.startsWith('55') && d.length >= 12 && d.length <= 13) d = d.slice(2);
  // Add 9th digit to 10-digit mobile
  if (d.length === 10 && ['7','8','9'].includes(d[2])) d = d.slice(0,2) + '9' + d.slice(2);
  return d.length >= 10 && d.length <= 11 ? d : null;
}

// Basic sanitize without DOM
const sanitize = (v: unknown): string =>
  !v ? '' : String(v).replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').trim().slice(0, 1000);

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Authorization,Content-Type' } });
  }

  const auth = req.headers.get('Authorization');
  if (!auth) return new Response(JSON.stringify({ error: 'Missing Authorization' }), { status: 401 });

  let body: { rows?: ContactImportRow[]; workspace_id?: string };
  try { body = await req.json(); }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 }); }

  const { rows, workspace_id } = body;
  if (!rows || !Array.isArray(rows) || !rows.length) return new Response(JSON.stringify({ error: 'rows required' }), { status: 400 });
  if (!workspace_id) return new Response(JSON.stringify({ error: 'workspace_id required' }), { status: 400 });
  if (rows.length > MAX_ROWS) return new Response(JSON.stringify({ error: `Max ${MAX_ROWS} rows per import` }), { status: 400 });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const result = { inserted: 0, updated: 0, skipped: 0, errors: [] as Array<{ row: number; error: string }> };
  const start = Date.now();

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);

    for (let j = 0; j < chunk.length; j++) {
      const row = chunk[j];
      const rowNum = i + j + 2; // 1-based + header row

      const name    = sanitize(row.name);
      if (!name) { result.errors.push({ row: rowNum, error: 'Nome é obrigatório' }); result.skipped++; continue; }

      const phone   = row.phone ? normalizeBR(row.phone) : null;
      const email   = sanitize(row.email)?.toLowerCase() || null;
      const company = sanitize(row.company) || null;
      const notes   = sanitize(row.notes) || null;
      const channel = sanitize(row.channel) || null;
      const tags    = row.tags ? row.tags.split(',').map((t) => sanitize(t.trim())).filter(Boolean) : [];

      try {
        // Dedup: find existing by phone or email
        let existingId: string | null = null;
        if (phone || email) {
          const conds = [...(phone ? [`phone.eq.${phone}`] : []), ...(email ? [`email.eq.${email}`] : [])];
          const { data } = await supabase
            .from('contacts')
            .select('id')
            .eq('workspace_id', workspace_id)
            .is('deleted_at', null)
            .or(conds.join(','))
            .limit(1);
          existingId = data?.[0]?.id ?? null;
        }

        if (existingId) {
          const { error } = await supabase.from('contacts').update({
            name, phone, email, company, notes, channel, tags, updated_at: new Date().toISOString(),
          }).eq('id', existingId);
          if (error) throw error;
          result.updated++;
        } else {
          const { error } = await supabase.from('contacts').insert({
            name, phone, email, company, notes, channel, tags, workspace_id, created_at: new Date().toISOString(),
          });
          if (error) {
            if (error.code === '23505') result.skipped++; // unique violation
            else throw error;
          } else {
            result.inserted++;
          }
        }
      } catch (err) {
        result.errors.push({ row: rowNum, error: String(err) });
        result.skipped++;
      }
    }
  }

  return new Response(JSON.stringify({
    ...result,
    total_processed: rows.length,
    duration_ms: Date.now() - start,
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
});
