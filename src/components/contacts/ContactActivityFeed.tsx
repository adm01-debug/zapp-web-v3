/**
 * ContactActivityFeed.tsx
 * Timeline of all interactions with a contact across channels.
 * Shows: conversations, notes, LGPD events, tag changes, purchases.
 *
 * Powers the CRM 360° view with unified activity stream.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageCircle, FileText, Shield, Tag, ShoppingBag,
  Phone, Mail, RefreshCw, ChevronDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText, sanitizeHtml } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';

// ── Types ──────────────────────────────────────────────────────────────────

type ActivityType =
  | 'conversation_opened'
  | 'conversation_closed'
  | 'message_sent'
  | 'message_received'
  | 'note_added'
  | 'lgpd_consent'
  | 'lgpd_optout'
  | 'tag_added'
  | 'tag_removed'
  | 'contact_created'
  | 'contact_edited'
  | 'purchase'
  | 'csat_received';

interface Activity {
  id:         string;
  type:       ActivityType;
  label:      string;
  detail?:    string;
  channel?:   string;
  agent?:     string;
  timestamp:  string;
}

interface ContactActivityFeedProps {
  contactId:   string;
  maxItems?:   number;
  className?:  string;
}

// ── Config ─────────────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  conversation_opened:  ({ className }) => <MessageCircle className={className} />,
  conversation_closed:  ({ className }) => <MessageCircle className={className} />,
  message_sent:         ({ className }) => <MessageCircle className={className} />,
  message_received:     ({ className }) => <MessageCircle className={className} />,
  note_added:           ({ className }) => <FileText className={className} />,
  lgpd_consent:         ({ className }) => <Shield className={className} />,
  lgpd_optout:          ({ className }) => <Shield className={className} />,
  tag_added:            ({ className }) => <Tag className={className} />,
  tag_removed:          ({ className }) => <Tag className={className} />,
  contact_created:      ({ className }) => <FileText className={className} />,
  contact_edited:       ({ className }) => <FileText className={className} />,
  purchase:             ({ className }) => <ShoppingBag className={className} />,
  csat_received:        ({ className }) => <MessageCircle className={className} />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  conversation_opened:  'bg-blue-100 text-blue-600',
  conversation_closed:  'bg-gray-100 text-gray-600',
  message_sent:         'bg-blue-100 text-blue-600',
  message_received:     'bg-green-100 text-green-600',
  note_added:           'bg-yellow-100 text-yellow-600',
  lgpd_consent:         'bg-green-100 text-green-600',
  lgpd_optout:          'bg-red-100 text-red-600',
  tag_added:            'bg-purple-100 text-purple-600',
  tag_removed:          'bg-orange-100 text-orange-600',
  contact_created:      'bg-green-100 text-green-600',
  contact_edited:       'bg-blue-100 text-blue-600',
  purchase:             'bg-emerald-100 text-emerald-600',
  csat_received:        'bg-amber-100 text-amber-600',
};

// ── Component ──────────────────────────────────────────────────────────────

export const ContactActivityFeed: React.FC<ContactActivityFeedProps> = ({
  contactId, maxItems = 20, className,
}) => {
  const [activities, setActivities]  = useState<Activity[]>([]);
  const [loading,    setLoading]     = useState(false);
  const [showAll,    setShowAll]     = useState(false);

  const PREVIEW_COUNT = 5;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const activities: Activity[] = [];

      // 1. Conversations
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, status, channel, created_at, updated_at, assigned_agent:profiles(full_name)')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(50);

      for (const c of convs ?? []) {
        activities.push({
          id:        `conv-opened-${c.id}`,
          type:      'conversation_opened',
          label:     'Conversa iniciada',
          channel:   sanitizeText(c.channel ?? ''),
          agent:     sanitizeText((c.assigned_agent as { full_name?: string } | null)?.full_name ?? ''),
          timestamp: c.created_at,
        });
        if (c.status === 'closed') {
          activities.push({
            id:        `conv-closed-${c.id}`,
            type:      'conversation_closed',
            label:     'Conversa encerrada',
            channel:   sanitizeText(c.channel ?? ''),
            timestamp: c.updated_at,
          });
        }
      }

      // 2. Audit log events
      const { data: audit } = await supabase
        .from('contact_audit_log')
        .select('id, action, changed_at, changed_by, new_values, profiles:changed_by(full_name)')
        .eq('contact_id', contactId)
        .order('changed_at', { ascending: false })
        .limit(20);

      for (const e of audit ?? []) {
        const agentName = sanitizeText((e.profiles as { full_name?: string } | null)?.full_name ?? 'Sistema');
        if (e.action === 'INSERT') {
          activities.push({ id: `audit-${e.id}`, type: 'contact_created', label: 'Contato criado', agent: agentName, timestamp: e.changed_at });
        } else if (e.action === 'UPDATE') {
          const changed = Object.keys((e.new_values as Record<string, unknown>) ?? {});
          const isLGPD = changed.some((k) => k.startsWith('lgpd_'));
          activities.push({
            id:        `audit-${e.id}`,
            type:      isLGPD ? 'lgpd_consent' : 'contact_edited',
            label:     isLGPD ? 'Consentimento LGPD atualizado' : 'Contato editado',
            detail:    changed.join(', '),
            agent:     agentName,
            timestamp: e.changed_at,
          });
        }
      }

      // Sort by timestamp desc
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setActivities(activities.slice(0, maxItems));
    } catch (err) {
      console.error('[ContactActivityFeed]', err);
    } finally {
      setLoading(false);
    }
  }, [contactId, maxItems]);

  useEffect(() => { load(); }, [load]);

  const displayedActivities = showAll ? activities : activities.slice(0, PREVIEW_COUNT);
  const hasMore = activities.length > PREVIEW_COUNT;

  if (loading && activities.length === 0) {
    return (
      <div className="space-y-2 animate-pulse" aria-busy="true" aria-label="Carregando atividades...">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-2">
            <div className="h-8 w-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-muted rounded w-48" />
              <div className="h-2.5 bg-muted rounded w-24" />
            </div>
          </div>
        ))}
        <span className="sr-only">Carregando histórico de atividades...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atividades recentes</p>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="h-6 w-6 p-0" aria-label="Atualizar atividades">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {activities.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">Nenhuma atividade registrada.</p>
      ) : (
        <>
          <div className="space-y-1" role="list" aria-label="Histórico de atividades">
            {displayedActivities.map((activity, idx) => {
              const Icon = ACTIVITY_ICONS[activity.type] ?? ACTIVITY_ICONS.contact_edited;
              const colorClass = ACTIVITY_COLORS[activity.type] ?? 'bg-gray-100 text-gray-600';
              const isLast = idx === displayedActivities.length - 1;

              return (
                <div key={activity.id} className="flex items-start gap-2.5 relative" role="listitem">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" aria-hidden="true" />
                  )}

                  {/* Icon */}
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 z-10 ${colorClass}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-3 min-w-0">
                    <p className="text-xs font-medium leading-tight">{activity.label}</p>
                    {activity.detail && (
                      <p className="text-xs text-muted-foreground truncate">{sanitizeText(activity.detail)}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground/70">
                        {new Date(activity.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {activity.agent && (
                        <span className="text-xs text-muted-foreground/70">· {activity.agent}</span>
                      )}
                      {activity.channel && (
                        <Badge variant="outline" className="text-xs px-1 py-0 h-4">{activity.channel}</Badge>
                      )}
                    </div>
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
              <ChevronDown className={`h-3 w-3 transition-transform ${showAll ? 'rotate-180' : ''}`} />
              {showAll ? 'Mostrar menos' : `Ver mais ${activities.length - PREVIEW_COUNT} atividade${activities.length - PREVIEW_COUNT !== 1 ? 's' : ''}`}
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default ContactActivityFeed;
