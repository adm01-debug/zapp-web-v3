/**
 * AuditLogPanel.tsx
 * Shows audit history of changes to a contact.
 * LGPD Art. 37 compliance — expandable field diffs.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, RefreshCw, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/lib/sanitize';

interface AuditEntry {
  id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RESTORE';
  changed_by: string | null;
  changed_at: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changer_name: string | null;
}

const ACTION_COLORS: Record<string, string> = {
  INSERT:  'bg-green-100 text-green-800 border-green-300',
  UPDATE:  'bg-blue-100 text-blue-800 border-blue-300',
  DELETE:  'bg-red-100 text-red-800 border-red-300',
  RESTORE: 'bg-amber-100 text-amber-800 border-amber-300',
};
const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Criado', UPDATE: 'Editado', DELETE: 'Excluído', RESTORE: 'Restaurado',
};
const FIELD_LABELS: Record<string, string> = {
  name: 'Nome', phone: 'Telefone', email: 'E-mail', company: 'Empresa',
  notes: 'Notas', tags: 'Tags', lgpd_consent_at: 'Consentimento LGPD',
  lgpd_opt_out_at: 'Opt-out LGPD', is_blocked: 'Bloqueado',
};

function renderVal(key: string, v: unknown): string {
  if (v === null || v === undefined) return '(vazio)';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (Array.isArray(v)) return v.map(sanitizeText).join(', ');
  if (typeof v === 'string' && key.endsWith('_at')) return new Date(v).toLocaleString('pt-BR');
  return sanitizeText(String(v));
}

export const AuditLogPanel: React.FC<{ contactId: string; maxEntries?: number }> = ({
  contactId, maxEntries = 20,
}) => {
  const [entries,  setEntries]  = useState<AuditEntry[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('contact_audit_log')
        .select('id,action,changed_by,changed_at,old_values,new_values,profiles:changed_by(full_name)')
        .eq('contact_id', contactId)
        .order('changed_at', { ascending: false })
        .limit(maxEntries);

      setEntries((data ?? []).map((e: Record<string, unknown>) => ({
        id: String(e.id),
        action: String(e.action) as AuditEntry['action'],
        changed_by: e.changed_by as string | null,
        changed_at: String(e.changed_at),
        old_values: e.old_values as Record<string, unknown> | null,
        new_values: e.new_values as Record<string, unknown> | null,
        changer_name: (e.profiles as Record<string, unknown> | null)?.full_name as string | null ?? 'Sistema',
      })));
    } catch (err) { console.error('[AuditLogPanel]', err); }
    finally { setLoading(false); }
  }, [contactId, maxEntries]);

  useEffect(() => { load(); }, [load]);

  if (!loading && entries.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-xs">
        <History className="h-6 w-6 mx-auto mb-1 opacity-30" />
        Nenhuma alteração registrada.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Histórico</span>
          <Shield className="h-3 w-3 text-muted-foreground" title="LGPD Art.37" />
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-6 w-6 p-0">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {entries.map((e) => {
          const fields = Object.keys(e.new_values ?? e.old_values ?? {});
          const isOpen = expanded === e.id;
          return (
            <div key={e.id} className="rounded border text-xs">
              <button type="button" onClick={() => setExpanded(isOpen ? null : e.id)}
                className="w-full flex items-center justify-between p-2 hover:bg-muted/30 text-left">
                <div className="flex items-center gap-2 min-w-0">
                  <Badge className={`text-xs border px-1.5 py-0 shrink-0 ${ACTION_COLORS[e.action]}`}>
                    {ACTION_LABELS[e.action]}
                  </Badge>
                  <span className="truncate text-muted-foreground">{sanitizeText(e.changer_name ?? 'Sistema')}</span>
                  {fields.length > 0 && <span className="text-muted-foreground/60 shrink-0">· {fields.length}c</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <span className="text-muted-foreground/60">{new Date(e.changed_at).toLocaleDateString('pt-BR', {day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                  {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>
              </button>
              {isOpen && fields.length > 0 && (
                <div className="border-t px-2 py-2 space-y-1 bg-muted/10">
                  {fields.map((f) => (
                    <div key={f} className="grid grid-cols-3 gap-1">
                      <span className="font-medium text-muted-foreground">{FIELD_LABELS[f] ?? sanitizeText(f)}</span>
                      {e.old_values?.[f] !== undefined && <span className="text-red-600 line-through truncate">{renderVal(f, e.old_values[f])}</span>}
                      {e.new_values?.[f] !== undefined && <span className="text-green-700 truncate">{renderVal(f, e.new_values[f])}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditLogPanel;
