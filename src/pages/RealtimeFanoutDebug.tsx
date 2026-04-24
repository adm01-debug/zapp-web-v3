import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Trash2, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  subscribeFanoutBus,
  getFanoutSubscriptions,
  getFanoutLastEvents,
  getFanoutRecentEvents,
  clearFanoutHistory,
  type FanoutEventRecord,
  type FanoutSubscriptionRecord,
} from "@/lib/devRealtimeLogger";

/**
 * The 8 known consumers of postgres_changes on `messages`.
 * Source of truth: TRILHA_MENSAGENS_NAVEGAVEL.mmd (subgraph "Realtime e Batching"
 * + AudioMessagePlayer in "Render"). Kept here so the panel always shows the
 * full fan-out, even before any of them mounts in the current session.
 */
const KNOWN_CONSUMERS: { name: string; description: string; events: string[] }[] = [
  { name: "useRealtimeMessages", description: "Feed global do inbox", events: ["INSERT", "UPDATE"] },
  { name: "useMessages", description: "Lista por contato aberto", events: ["INSERT", "UPDATE", "DELETE"] },
  { name: "useMessageStatus", description: "Status sent/delivered/read", events: ["UPDATE"] },
  { name: "useTranscriptionNotifications", description: "Alerta quando transcrição conclui", events: ["UPDATE"] },
  { name: "useRealtimeDashboard", description: "KPIs em tempo real", events: ["INSERT", "UPDATE"] },
  { name: "useEvolutionMonitoring", description: "Saúde do webhook/instância", events: ["INSERT"] },
  { name: "AudioMessagePlayer", description: "Refresh de media_url assinada", events: ["UPDATE"] },
  { name: "useMessageUpdateBatcher", description: "Batching upstream de useRealtimeMessages", events: ["batched"] },
];

function relativeTime(ts: number | undefined | null): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  if (diff < 1000) return "agora";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s atrás`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min atrás`;
  return `${Math.floor(diff / 3_600_000)}h atrás`;
}

function eventBadgeVariant(evt: string): { className: string; label: string } {
  const upper = evt.toUpperCase();
  if (upper.startsWith("INSERT")) return { className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400", label: "INSERT" };
  if (upper.startsWith("UPDATE")) return { className: "bg-amber-500/15 text-amber-700 dark:text-amber-400", label: "UPDATE" };
  if (upper.startsWith("DELETE")) return { className: "bg-destructive/15 text-destructive", label: "DELETE" };
  return { className: "bg-muted text-muted-foreground", label: upper };
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

export default function RealtimeFanoutDebug() {
  const [, force] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Re-render whenever the bus notifies
  useEffect(() => {
    const unsub = subscribeFanoutBus(() => force((n) => n + 1));
    return unsub;
  }, []);

  // Tick every 1s so "X s atrás" stays fresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [autoRefresh]);

  const subs: FanoutSubscriptionRecord[] = useMemo(() => getFanoutSubscriptions(), []);
  const lastByHook = useMemo(() => getFanoutLastEvents(), []);
  const recent: FanoutEventRecord[] = useMemo(() => getFanoutRecentEvents(), []);

  // Re-derive on every render (bus mutations are by reference, but we want fresh snapshots)
  const liveSubs = getFanoutSubscriptions();
  const liveLast = getFanoutLastEvents();
  const liveRecent = getFanoutRecentEvents();

  const consumers = KNOWN_CONSUMERS.map((c) => {
    const sub = liveSubs.find((s) => s.hookName === c.name);
    const last = liveLast.get(c.name);
    return { ...c, sub, last };
  });

  const totalSubs = liveSubs.length;
  const totalEvents = liveRecent.length;
  const activeConsumers = consumers.filter((c) => c.sub).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="Voltar">
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" /> Realtime Fan-out — debug
              </h1>
              <p className="text-xs text-muted-foreground">
                {activeConsumers}/{KNOWN_CONSUMERS.length} consumidores ativos · {totalSubs} subscriptions · {totalEvents} eventos recentes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={autoRefresh ? "secondary" : "outline"} size="sm" onClick={() => setAutoRefresh((v) => !v)}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", autoRefresh && "animate-spin")} />
              Auto-refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => clearFanoutHistory()}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Limpar
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Consumidores de postgres_changes (messages)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {consumers.map((c) => {
              const isActive = !!c.sub;
              const last = c.last;
              return (
                <div
                  key={c.name}
                  className={cn(
                    "flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors",
                    isActive ? "border-border" : "border-dashed border-border/60 bg-muted/20"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn("font-mono text-sm font-semibold", !isActive && "text-muted-foreground")}>
                        {c.name}
                      </span>
                      {c.events.map((e) => {
                        const v = eventBadgeVariant(e);
                        return (
                          <Badge key={e} variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4", v.className)}>
                            {v.label}
                          </Badge>
                        );
                      })}
                      {isActive ? (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5">subscrito</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-muted-foreground">não montado</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>
                    {c.sub?.bind.filter && (
                      <p className="text-[11px] font-mono text-muted-foreground/80 mt-0.5 truncate">
                        filter: {c.sub.bind.filter}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs whitespace-nowrap">
                    {last ? (
                      <>
                        <div className="flex items-center justify-end gap-1.5">
                          <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", eventBadgeVariant(last.eventType).className)}>
                            {eventBadgeVariant(last.eventType).label}
                          </Badge>
                          <span className="font-mono text-muted-foreground">{relativeTime(last.receivedAt)}</span>
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground/80 mt-0.5 truncate max-w-[180px]">
                          id={last.rowId ?? "—"}
                        </div>
                      </>
                    ) : (
                      <span className="text-muted-foreground">sem eventos</span>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Eventos recentes (50 últimos)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-border">
                {liveRecent.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nenhum evento recebido ainda. Interaja com o inbox para gerar tráfego.
                  </div>
                ) : (
                  liveRecent.map((ev, i) => {
                    const v = eventBadgeVariant(ev.eventType);
                    return (
                      <div key={`${ev.receivedAt}-${i}`} className="px-3 py-2 text-xs flex items-center gap-2">
                        <span className="font-mono text-muted-foreground tabular-nums">{formatTime(ev.receivedAt)}</span>
                        <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", v.className)}>{v.label}</Badge>
                        <span className="font-mono font-semibold text-primary truncate flex-1">{ev.hookName}</span>
                        <span className="font-mono text-muted-foreground/80 truncate max-w-[120px]">id={ev.rowId ?? "—"}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
