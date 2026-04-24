/**
 * IdempotencyMissBanner — admin-only visual badge for the Evolution send
 * cache health on the Connections page. Renders nothing for non-admins or
 * when no instance has crossed the threshold in the last hour.
 *
 * The matching warroom alert (toast + push) is raised by the same hook,
 * so this banner is a quiet "context" surface — it answers *which* instance
 * is misbehaving without requiring the admin to open the war room.
 */
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useIdempotencyMissAlerts } from '@/hooks/monitoring/useIdempotencyMissAlerts';

export function IdempotencyMissBanner() {
  const { counts, threshold, enabled } = useIdempotencyMissAlerts();
  if (!enabled) return null;

  const breaching = counts.filter((c) => c.overThreshold);
  if (breaching.length === 0) return null;

  return (
    <Card
      role="alert"
      aria-live="polite"
      className="border-warning/40 bg-warning/5"
    >
      <CardContent className="p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 mt-0.5 text-warning shrink-0" aria-hidden />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-foreground">
              Cache de idempotência sob pressão
            </p>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              última hora
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {breaching.length === 1
              ? `1 instância ultrapassou o limite de ${threshold} cache misses/hora.`
              : `${breaching.length} instâncias ultrapassaram o limite de ${threshold} cache misses/hora.`}{' '}
            Isso pode indicar TTL curto, rotação de chaves ou DLQ replays.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {breaching.map((item) => (
              <Badge
                key={item.instance}
                variant="destructive"
                className="font-mono text-xs"
                title={`${item.count} idempotency_miss em ${item.instance}`}
              >
                {item.instance} · {item.count}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
