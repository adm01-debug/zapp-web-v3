/**
 * ActivityTimeline.tsx
 * Visual activity timeline for the contact 360° view.
 * Connects to useContactActivityFeed for real-time updates.
 */
import React from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useContactActivityFeed, ActivityType } from './useContactActivityFeed';

const ICONS: Record<ActivityType, string> = {
  conversation_started:'💬', conversation_closed:'✅',
  message_sent:'📤', message_received:'📥',
  contact_created:'👤', contact_updated:'✏️', contact_merged:'🔀',
  csat_submitted:'⭐', tag_added:'🏷️', tag_removed:'🏷️',
  note_added:'📝', phone_added:'📱',
  consent_granted:'✅', consent_revoked:'🚫',
};

const CHANNEL_STYLES: Record<string, string> = {
  whatsapp:'bg-green-100 text-green-800',
  instagram:'bg-pink-100 text-pink-800',
  telegram:'bg-blue-100 text-blue-800',
  email:'bg-gray-100 text-gray-700',
};

function reltime(ts: string): string {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (d < 60) return 'agora';
  if (d < 3600) return `${Math.floor(d/60)}min`;
  if (d < 86400) return `${Math.floor(d/3600)}h`;
  if (d < 604800) return `${Math.floor(d/86400)}d`;
  return new Date(ts).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'});
}

export const ActivityTimeline: React.FC<{ contactId: string; maxItems?: number }> = ({
  contactId, maxItems = 20,
}) => {
  const { activities, loading, refresh } = useContactActivityFeed({ contactId, limit: maxItems });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Atividade</span>
        <Button variant="ghost" size="sm" onClick={refresh} disabled={loading} className="h-6 w-6 p-0">
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading && activities.length === 0 && (
        <div className="space-y-3 animate-pulse py-2">
          {[1,2,3].map(i => (
            <div key={i} className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5 pt-1">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && activities.length === 0 && (
        <p className="text-xs text-center text-muted-foreground italic py-3">Nenhuma atividade.</p>
      )}

      <div className="max-h-72 overflow-y-auto space-y-0">
        {activities.map((item, i) => (
          <div key={item.id} className="flex gap-3 relative">
            {i < activities.length - 1 && (
              <div className="absolute left-4 top-7 bottom-0 w-px bg-border" />
            )}
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm shrink-0 z-10">
              {ICONS[item.type] ?? '•'}
            </div>
            <div className="flex-1 pb-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium leading-tight">{item.label}</p>
                <span className="text-xs text-muted-foreground shrink-0">{reltime(item.timestamp)}</span>
              </div>
              <div className="flex gap-1.5 mt-0.5 flex-wrap">
                {item.actor && <span className="text-xs text-muted-foreground">{item.actor}</span>}
                {item.channel && (
                  <span className={`text-xs rounded-full px-1.5 py-0 ${CHANNEL_STYLES[item.channel] ?? 'bg-muted text-muted-foreground'}`}>
                    {item.channel}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;
