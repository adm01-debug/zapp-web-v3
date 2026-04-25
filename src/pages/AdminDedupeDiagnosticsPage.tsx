/**
 * Admin: Diagnósticos do Dedupe Cross-Tab.
 *
 * Mostra em tempo real (refresh 1.5s):
 *   - Chaves ativas (locks + resultados em cache) com TTL restante
 *   - Inflight da aba atual e número de waiters
 *   - Contadores agregados de hits/misses por motivo e por namespace
 *   - Foco em leituras do inbox (`inbox:*`, `older:*`) com totais isolados
 *
 * Restrito a supervisor+ via VIEW_REQUIRED_ROLES no ViewRouter.
 */
import { useMemo, useState } from 'react';
import { Activity, KeyRound, Lock, Database, Pause, Play, RefreshCw, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDedupeIntrospect } from '@/hooks/useDedupeIntrospect';
import { extractNamespace } from '@/lib/realtime/dedupeTelemetry';
import CrossTabEfficiencyBlock from '@/pages/admin-dedupe-diagnostics/CrossTabEfficiencyBlock';
import { cn } from '@/lib/utils';

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmtBytes(b: number): string {
  if (!b) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

const INBOX_NAMESPACES = new Set(['inbox', 'older']);

export default function AdminDedupeDiagnosticsPage() {
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState('');
  const data = useDedupeIntrospect(paused ? 0 : 1500);
  const { introspect, telemetry } = data;

  const f = filter.trim().toLowerCase();
  const matches = (key: string) => !f || key.toLowerCase().includes(f);

  const inboxStats = useMemo(() => {
    let hits = 0;
    let misses = 0;
    for (const [ns, v] of Object.entries(telemetry.byNamespace)) {
      if (INBOX_NAMESPACES.has(ns)) {
        hits += v.hits;
        misses += v.misses;
      }
    }
    const total = hits + misses;
    return {
      hits,
      misses,
      total,
      hitRate: total === 0 ? 0 : hits / total,
      saved: hits, // cada hit é um request economizado
    };
  }, [telemetry]);

  const inboxLocks = introspect.locks.filter((l) => INBOX_NAMESPACES.has(extractNamespace(l.key)));
  const inboxResults = introspect.results.filter((r) =>
    INBOX_NAMESPACES.has(extractNamespace(r.key)),
  );

  const filteredLocks = introspect.locks.filter((l) => matches(l.key));
  const filteredResults = introspect.results.filter((r) => matches(r.key));
  const filteredInflight = introspect.inflight.filter((i) => matches(i.key));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Diagnósticos do Dedupe
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Estado em tempo real do <code className="text-xs">crossTabDedupe</code> — chaves
            ativas, TTLs, locks e métricas agregadas. Tab ID:{' '}
            <code className="text-xs">{introspect.tabId}</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="auto" checked={!paused} onCheckedChange={(v) => setPaused(!v)} />
            <Label htmlFor="auto" className="text-sm flex items-center gap-1">
              {paused ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              Auto-refresh
            </Label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPaused((p) => p)}
            disabled={!paused}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* KPIs gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Chaves ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {introspect.results.length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {introspect.inflight.length} em execução
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Locks ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">{introspect.locks.length}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {introspect.locks.filter((l) => l.isOwnedByThisTab).length} desta aba
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-2">
              <Database className="h-4 w-4" />
              Hit rate global
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums">
              {(telemetry.hitRate * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {telemetry.hits} hits / {telemetry.total} total
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              Inbox — requests deduplicados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold tabular-nums text-primary">
              {inboxStats.saved}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {(inboxStats.hitRate * 100).toFixed(1)}% hit • {inboxStats.total} chamadas
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Eficiência cross-tab — leader vs follower, latência, calls saved */}
      <CrossTabEfficiencyBlock />

      {/* Filtro */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar por chave (ex.: inbox:initial:5511...)"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-md"
        />
        {filter && (
          <Button variant="ghost" size="sm" onClick={() => setFilter('')}>
            Limpar
          </Button>
        )}
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">
            Chaves ativas ({filteredResults.length + filteredLocks.length})
          </TabsTrigger>
          <TabsTrigger value="inflight">Inflight ({filteredInflight.length})</TabsTrigger>
          <TabsTrigger value="metrics">Métricas por motivo</TabsTrigger>
          <TabsTrigger value="namespaces">Por namespace</TabsTrigger>
        </TabsList>

        {/* CHAVES ATIVAS — locks + resultados cacheados com TTL */}
        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Locks ativos</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredLocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum lock ativo.</p>
              ) : (
                <ScrollArea className="h-[280px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chave</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead className="text-right">TTL restante</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLocks.map((l) => (
                        <TableRow key={l.key}>
                          <TableCell className="font-mono text-xs">{l.key}</TableCell>
                          <TableCell>
                            {l.isOwnedByThisTab ? (
                              <Badge>esta aba</Badge>
                            ) : (
                              <Badge variant="outline" className="font-mono text-[10px]">
                                {l.ownerId.slice(0, 12)}…
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmtMs(l.ttlRemainingMs)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Resultados em cache</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredResults.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum resultado cacheado.</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Chave</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead className="text-right">Tamanho</TableHead>
                        <TableHead className="text-right">TTL restante</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((r) => {
                        const lowTtl = r.ttlRemainingMs < 5000;
                        return (
                          <TableRow key={r.key}>
                            <TableCell className="font-mono text-xs">{r.key}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {r.inMemory && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    memória
                                  </Badge>
                                )}
                                {r.sizeBytes > 0 && (
                                  <Badge variant="outline" className="text-[10px]">
                                    persistido
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                              {fmtBytes(r.sizeBytes)}
                            </TableCell>
                            <TableCell
                              className={cn(
                                'text-right tabular-nums',
                                lowTtl && 'text-amber-600 dark:text-amber-400',
                              )}
                            >
                              {fmtMs(r.ttlRemainingMs)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {(inboxLocks.length > 0 || inboxResults.length > 0) && (
            <Card className="mt-4 border-primary/30">
              <CardHeader>
                <CardTitle className="text-base">
                  Foco Inbox ({inboxLocks.length} locks • {inboxResults.length} cacheadas)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-2">
                  Chaves dos namespaces <code>inbox:*</code> e <code>older:*</code> — leituras de
                  conversas e paginação.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* INFLIGHT */}
        <TabsContent value="inflight" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Em execução nesta aba ({filteredInflight.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredInflight.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum fetch em andamento.</p>
              ) : (
                <ul className="space-y-1.5">
                  {filteredInflight.map((i) => (
                    <li
                      key={i.key}
                      className="font-mono text-xs px-3 py-1.5 rounded bg-muted/50 flex items-center justify-between"
                    >
                      <span>{i.key}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        executando
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
              {introspect.waiters.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Aguardando broadcast</h4>
                  <ul className="space-y-1.5">
                    {introspect.waiters
                      .filter((w) => matches(w.key))
                      .map((w) => (
                        <li
                          key={w.key}
                          className="font-mono text-xs px-3 py-1.5 rounded bg-muted/50 flex items-center justify-between"
                        >
                          <span>{w.key}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {w.count} waiter{w.count > 1 ? 's' : ''}
                          </Badge>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MÉTRICAS POR MOTIVO */}
        <TabsContent value="metrics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Eventos agregados ({telemetry.total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(telemetry.byReason)
                    .sort(([, a], [, b]) => b - a)
                    .map(([reason, count]) => {
                      const isHit = [
                        'memory_cache',
                        'persisted_cache',
                        'inflight_local',
                        'broadcast_wait',
                        'late_cache',
                      ].includes(reason);
                      return (
                        <TableRow key={reason}>
                          <TableCell className="font-mono text-xs">{reason}</TableCell>
                          <TableCell>
                            <Badge variant={isHit ? 'default' : 'outline'} className="text-[10px]">
                              {isHit ? 'HIT' : 'MISS'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{count}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* POR NAMESPACE */}
        <TabsContent value="namespaces" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Hits / misses por namespace</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(telemetry.byNamespace).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum evento ainda.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Namespace</TableHead>
                      <TableHead className="text-right">Hits</TableHead>
                      <TableHead className="text-right">Misses</TableHead>
                      <TableHead className="text-right">Hit rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(telemetry.byNamespace)
                      .sort(([, a], [, b]) => b.hits + b.misses - (a.hits + a.misses))
                      .map(([ns, v]) => {
                        const total = v.hits + v.misses;
                        const rate = total === 0 ? 0 : v.hits / total;
                        const isInbox = INBOX_NAMESPACES.has(ns);
                        return (
                          <TableRow key={ns} className={cn(isInbox && 'bg-primary/5')}>
                            <TableCell className="font-mono text-xs">
                              {ns}
                              {isInbox && (
                                <Badge variant="outline" className="ml-2 text-[10px]">
                                  inbox
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">{v.hits}</TableCell>
                            <TableCell className="text-right tabular-nums">{v.misses}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {(rate * 100).toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
