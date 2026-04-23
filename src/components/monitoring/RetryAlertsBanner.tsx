import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { InstanceBreach } from '@/lib/retryAlerts';

interface RetryAlertsBannerProps {
  breaches: InstanceBreach[];
}

export function RetryAlertsBanner({ breaches }: RetryAlertsBannerProps) {
  if (breaches.length === 0) return null;

  return (
    <div className="space-y-2">
      {breaches.map((b) => (
        <Alert key={b.instance} variant="destructive" className="py-3">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm">
            Instância <span className="font-mono">{b.instance}</span> degradada
          </AlertTitle>
          <AlertDescription className="mt-1.5 space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              {b.reasons.map((r, i) => (
                <Badge key={i} variant="outline" className="text-[10px] border-destructive/40 bg-destructive/10 font-mono">
                  {r}
                </Badge>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {b.metrics.total} runs · sucesso pós-retry: {b.metrics.successAfterRetry} · falhas: {b.metrics.failed + b.metrics.exhausted}
            </p>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
