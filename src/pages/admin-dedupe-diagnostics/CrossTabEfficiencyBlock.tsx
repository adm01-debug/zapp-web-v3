/**
 * Bloco de KPIs cross-tab — quanto o dedupe está economizando entre abas.
 *
 * Mostra, em tempo real:
 *   - Cache hits (com breakdown local vs cross-tab follower)
 *   - Leader vs follower count (quantas vezes esta aba executou vs apenas
 *     consumiu resultados de outra aba)
 *   - Latência média / p50 / p95 da execução do líder e da espera do follower
 *   - Estimativa de chamadas economizadas (sum de hits)
 *
 * Usa `useDedupeMetrics` (reativo via subscriber, sem polling).
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Crown, Users, Clock, TrendingDown, Zap } from 'lucide-react';
import { useDedupeMetrics } from '@/hooks/useDedupeMetrics';
import type { LatencyStats } from '@/lib/realtime/dedupeTelemetry';

function fmtMs(ms: number): string {
  if (!ms || ms < 1) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function pct(num: number, den: number): string {
  if (!den) return '—';
  return `${((num / den) * 100).toFixed(1)}%`;
}

function LatencyLine({ label, stats }: { label: string; stats: LatencyStats }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-mono">
        avg {fmtMs(stats.avgMs)} · p50 {fmtMs(stats.p50Ms)} · p95 {fmtMs(stats.p95Ms)} · max {fmtMs(stats.maxMs)}
        <span className="text-muted-foreground/60 ml-2">({stats.count})</span>
      </span>
    </div>
  );
}

export default function CrossTabEfficiencyBlock() {
  const m = useDedupeMetrics();
  const totalCalls = m.total;
  const followerShareOfHits = m.hits === 0 ? 0 : m.followerCount / m.hits;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Chamadas economizadas */}
      <Card className="border-emerald-500/40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-emerald-500" />
            Chamadas economizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {m.callsSaved}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            de {totalCalls} chamadas ({pct(m.hits, totalCalls)} hit)
          </div>
        </CardContent>
      </Card>

      {/* Leader vs Follower */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
            <Crown className="h-4 w-4" />
            Esta aba (líder)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums">{m.leaderCount}</div>
          <div className="text-xs text-muted-foreground mt-1">
            executou o fetcher
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
            <Users className="h-4 w-4" />
            Follower de outra aba
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums">{m.followerCount}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {pct(m.followerCount, m.hits)} dos hits • broadcast / persisted
          </div>
        </CardContent>
      </Card>

      {/* Cache local */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Cache local desta aba
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold tabular-nums">{m.localCacheCount}</div>
          <div className="text-xs text-muted-foreground mt-1">
            memory + inflight (sem ir para outras abas)
          </div>
        </CardContent>
      </Card>

      {/* Latências — ocupa toda a linha */}
      <Card className="md:col-span-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Latência do dedupe
            <Badge variant="outline" className="ml-2 font-normal">
              últimas 200 amostras por bucket
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <LatencyLine label="Líder (executou fetcher)" stats={m.leaderLatency} />
          <LatencyLine label="Follower (esperou broadcast)" stats={m.followerLatency} />
          {m.followerLatency.count > 0 && m.leaderLatency.count > 0 && (
            <div className="text-xs text-muted-foreground pt-1 border-t border-border">
              Follower é{' '}
              <span className="font-semibold text-foreground">
                {(m.leaderLatency.avgMs / Math.max(1, m.followerLatency.avgMs)).toFixed(1)}× mais rápido
              </span>{' '}
              que o líder em média ({pct(m.followerCount, m.hits + m.misses)} das chamadas pegaram esse atalho).
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
