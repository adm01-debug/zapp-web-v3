import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Stethoscope, CheckCircle2, XCircle, AlertTriangle, Loader2, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiagnosticResult } from './hooks/useEvolutionMonitoring';

interface Props {
  diagnostic: DiagnosticResult | null;
  diagnosing: boolean;
  onRunDiagnostic: (autoFix?: boolean) => void;
}

const severityConfig: Record<string, { icon: typeof CheckCircle2; color: string; label: string }> = {
  ok: { icon: CheckCircle2, color: 'text-emerald-500', label: 'OK' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', label: 'Atenção' },
  critical: { icon: XCircle, color: 'text-destructive', label: 'Crítico' },
  error: { icon: XCircle, color: 'text-destructive', label: 'Erro' },
};

export function MonitoringDiagnosticPanel({ diagnostic, diagnosing, onRunDiagnostic }: Props) {
  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={() => onRunDiagnostic(false)} disabled={diagnosing} variant="outline">
          {diagnosing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Stethoscope className="w-4 h-4 mr-2" />}
          Executar Diagnóstico
        </Button>
        <Button onClick={() => onRunDiagnostic(true)} disabled={diagnosing} variant="default">
          {diagnosing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wrench className="w-4 h-4 mr-2" />}
          Diagnóstico + Auto-Fix
        </Button>
      </div>

      {diagnostic && (
        <>
          {/* Overall Health */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Saúde Geral do Sistema</CardTitle>
              <CardDescription>Score baseado em conexão, webhook e fluxo de mensagens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className={cn(
                  'text-4xl font-bold',
                  diagnostic.overallHealth.score >= 80 ? 'text-emerald-500' :
                  diagnostic.overallHealth.score >= 50 ? 'text-amber-500' : 'text-destructive'
                )}>
                  {diagnostic.overallHealth.score}/100
                </div>
                <div className="flex-1">
                  <Progress
                    value={diagnostic.overallHealth.score}
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Status: <span className="font-medium">{diagnostic.overallHealth.status}</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Per-instance diagnostics */}
          {diagnostic.diagnostics.map((d, i) => {
            const sev = severityConfig[d.webhookSeverity] || severityConfig.error;
            const SevIcon = sev.icon;

            return (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {d.instance}
                    <Badge variant={d.connectionState === 'open' ? 'default' : 'destructive'} className="text-xs">
                      {d.connectionState}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Webhook Status */}
                  <div className="flex items-center gap-2">
                    <SevIcon className={cn('w-4 h-4', sev.color)} />
                    <span className="text-sm font-medium">Webhook: {sev.label}</span>
                    {d.webhookIssue && <span className="text-xs text-muted-foreground">— {d.webhookIssue}</span>}
                  </div>

                  {d.webhook && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">URL Correta:</span>{' '}
                        <span className={d.webhook.urlCorrect ? 'text-emerald-500' : 'text-destructive'}>
                          {d.webhook.urlCorrect ? 'Sim ✓' : 'Não ✗'}
                        </span>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <span className="text-muted-foreground">Eventos:</span>{' '}
                        <span>{d.webhook.eventsCount}</span>
                      </div>
                    </div>
                  )}

                  {d.webhook?.missingCritical && d.webhook.missingCritical.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground mr-1">Ausentes:</span>
                      {d.webhook.missingCritical.map(e => (
                        <Badge key={e} variant="destructive" className="text-[10px]">{e}</Badge>
                      ))}
                    </div>
                  )}

                  {/* Message Flow */}
                  {d.messageFlow && (
                    <div className="flex items-center gap-4 text-xs">
                      <Badge variant="outline" className={cn(
                        d.messageFlow.flowHealth === 'healthy' ? 'border-emerald-500/30' : 'border-destructive/30'
                      )}>
                        Fluxo: {d.messageFlow.flowHealth}
                      </Badge>
                      <span>↓{d.messageFlow.lastHour.incoming} ↑{d.messageFlow.lastHour.outgoing}</span>
                    </div>
                  )}

                  {/* Auto-fix result */}
                  {d.autoFix && (
                    <div className={cn(
                      'p-2 rounded text-xs',
                      d.autoFix.applied ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'
                    )}>
                      {d.autoFix.applied ? '✅ Auto-fix aplicado com sucesso' : '❌ Auto-fix falhou'}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </>
      )}

      {!diagnostic && !diagnosing && (
        <Card>
          <CardContent className="py-12 text-center">
            <Stethoscope className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Execute um diagnóstico para verificar o estado completo do sistema.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
