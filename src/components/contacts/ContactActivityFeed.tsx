/**
 * ContactActivityFeed.tsx — v2.0
 * Real activity timeline using evolution_conversations + contact_audit_log.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  MessageCircle,
  FileText,
  Shield,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { sanitizeText } from '@/lib/sanitize';

interface Activity {
  id: string;
  type: string;
  label: string;
  detail?: string;
  timestamp: string;
}

const ICONS: Record<string, React.FC<{ className?: string }>> = {
  conversation_open: ({ className }) => <MessageCircle className={className} />,
  conversation_closed: ({ className }) => <MessageCircle className={className} />,
  edit: ({ className }) => <FileText className={className} />,
  lgpd: ({ className }) => <Shield className={className} />,
  merge: ({ className }) => <RotateCcw className={className} />,
  delete: ({ className }) => <FileText className={className} />,
  restore: ({ className }) => <RotateCcw className={className} />,
  note: ({ className }) => <FileText className={className} />,
};

const COLORS: Record<string, string> = {
  conversation_open: 'bg-primary text-primary',
  conversation_closed: 'bg-muted text-muted-foreground',
  edit: 'bg-primary text-primary',
  lgpd: 'bg-primary text-primary',
  merge: 'bg-primary text-primary',
  delete: 'bg-destructive text-destructive-foreground',
  restore: 'bg-warning text-warning-foreground',
  note: 'bg-warning text-warning',
};

export const ContactActivityFeed: React.FC<{ contactId: string; maxItems?: number }> = ({
  contactId,
  maxItems = 20,
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const PREVIEW = 5;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all: Activity[] = [];

      // Conversations
      const { data: convs, error: _convsErr } = await (supabase as any).rpc(
        'get_contact_conversations',
        { p_contact_id: contactId, p_limit: 30 }
      );
      for (const c of (convs ?? []) as Record<string, unknown>[]) {
        if (c.first_message_at)
          all.push({
            id: `conv-open-${c.id}`,
            type: 'conversation_open',
            label: 'Conversa iniciada',
            detail: c.assigned_to ? `Atendente: ${sanitizeText(String(c.assigned_to))}` : undefined,
            timestamp: String(c.first_message_at),
          });
        if (c.status === 'closed' && c.last_message_at)
          all.push({
            id: `conv-closed-${c.id}`,
            type: 'conversation_closed',
            label: 'Conversa encerrada',
            detail: `${c.message_count ?? 0} msgs`,
            timestamp: String(c.last_message_at),
          });
      }

      // Audit log
      const { data: audit, error: _auditErr } = await (
        supabase.from('contact_audit_log' as any) as any
      )
        .select('id,action,field_name,changed_at')
        .eq('contact_id', contactId)
        .order('changed_at', { ascending: false })
        .limit(30);
      for (const e of (audit ?? []) as Record<string, unknown>[]) {
        const field = String(e.field_name ?? '');
        const action = String(e.action ?? '');
        if (action === 'INSERT') {
          all.push({
            id: `a-${e.id}`,
            type: 'edit',
            label: 'Contato criado',
            timestamp: String(e.changed_at),
          });
        } else if (action === 'DELETE') {
          all.push({
            id: `a-${e.id}`,
            type: 'delete',
            label: 'Contato excluído',
            timestamp: String(e.changed_at),
          });
        } else if (action === 'RESTORE') {
          all.push({
            id: `a-${e.id}`,
            type: 'restore',
            label: 'Contato restaurado',
            timestamp: String(e.changed_at),
          });
        } else if (field.startsWith('lgpd') || action.includes('lgpd')) {
          all.push({
            id: `a-${e.id}`,
            type: 'lgpd',
            label: field.includes('opt_out') ? 'Opt-out LGPD' : 'Consentimento LGPD',
            timestamp: String(e.changed_at),
          });
        } else if (field === 'note_added') {
          all.push({
            id: `a-${e.id}`,
            type: 'note',
            label: 'Nota adicionada',
            timestamp: String(e.changed_at),
          });
        } else if (field.includes('merge')) {
          all.push({
            id: `a-${e.id}`,
            type: 'merge',
            label: 'Contatos mesclados',
            timestamp: String(e.changed_at),
          });
        } else if (action === 'UPDATE' && field) {
          all.push({
            id: `a-${e.id}`,
            type: 'edit',
            label: `Editado: ${field}`,
            timestamp: String(e.changed_at),
          });
        }
      }

      all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setActivities(all.slice(0, maxItems));
    } catch (err) {
      console.error('[ContactActivityFeed]', err);
    } finally {
      setLoading(false);
    }
  }, [contactId, maxItems]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = showAll ? activities : activities.slice(0, PREVIEW);
  const hasMore = activities.length > PREVIEW;

  if (loading && !activities.length)
    return (
      <div className="animate-pulse space-y-2" aria-busy="true">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2 p-1.5">
            <div className="h-7 w-7 shrink-0 rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-36 rounded bg-muted" />
              <div className="h-2 w-20 rounded bg-muted" />
            </div>
          </div>
        ))}
        <span className="sr-only">Carregando atividades...</span>
      </div>
    );

  if (!loading && !activities.length)
    return (
      <div className="py-4 text-center text-xs text-muted-foreground">
        <MessageCircle className="mx-auto mb-1 h-6 w-6 opacity-30" />
        <p>Nenhuma atividade registrada.</p>
      </div>
    );

  return (
    <div className="space-y-1">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Atividade recente
        </p>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-6 w-6 p-0">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <div className="space-y-0.5" role="list">
        {shown.map((a, idx) => {
          const Icon = ICONS[a.type] ?? ICONS.edit;
          const colorCls = COLORS[a.type] ?? COLORS.edit;
          const isLast = idx === shown.length - 1;
          return (
            <div key={a.id} className="relative flex items-start gap-2.5" role="listitem">
              {!isLast && (
                <div
                  className="absolute bottom-0 left-[13px] top-7 w-px bg-border"
                  aria-hidden="true"
                />
              )}
              <div
                className={`z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${colorCls}`}
              >
                <Icon className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1 pb-3">
                <p className="text-xs font-medium leading-tight">{a.label}</p>
                {a.detail && (
                  <p className="truncate text-xs text-muted-foreground">{sanitizeText(a.detail)}</p>
                )}
                <p className="mt-0.5 text-xs text-muted-foreground/60">
                  {new Date(a.timestamp).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll((v) => !v)}
          className="w-full gap-1 text-xs text-muted-foreground"
          aria-expanded={showAll}
        >
          {showAll ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showAll ? 'Ver menos' : `Ver mais ${activities.length - PREVIEW}`}
        </Button>
      )}
    </div>
  );
};

export default ContactActivityFeed;
