import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, RefreshCw, Search, Timer, TrendingUp } from "lucide-react";
import {
  useConversationSlaPanel,
  type SlaStatus,
  type SlaPriority,
} from "@/hooks/useConversationSlaPanel";

const STATUS_LABEL: Record<SlaStatus, string> = {
  on_track: "No prazo",
  at_risk: "Em risco",
  breached: "Atrasado",
};
const STATUS_VARIANT: Record<SlaStatus, "default" | "secondary" | "destructive"> = {
  on_track: "secondary",
  at_risk: "default",
  breached: "destructive",
};
const PRIORITY_LABEL: Record<SlaPriority, string> = {
  low: "Baixa", medium: "Média", high: "Alta", critical: "Crítica",
};
const PRIORITY_RANK: Record<SlaPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function formatDuration(sec: number) {
  if (!Number.isFinite(sec) || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function AdminConversationSlaPage() {
  const [status, setStatus] = useState<SlaStatus | "all">("all");
  const [priority, setPriority] = useState<SlaPriority | "all">("all");
  const [search, setSearch] = useState("");

  const { rows, loading, error, refetch } = useConversationSlaPanel({
    status: status === "all" ? null : status,
    priority: priority === "all" ? null : priority,
    search,
  });

  const stats = useMemo(() => {
    const totals = { total: rows.length, breached: 0, at_risk: 0, on_track: 0, avgWait: 0 };
    let waitSum = 0;
    rows.forEach((r) => {
      totals[r.sla_status] = (totals[r.sla_status] ?? 0) + 1;
      waitSum += r.wait_seconds;
    });
    totals.avgWait = rows.length ? Math.round(waitSum / rows.length) : 0;
    return totals;
  }, [rows]);

  const ranking = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
          b.wait_seconds - a.wait_seconds,
      ).slice(0, 8),
    [rows],
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">SLA por conversa</h1>
          <p className="text-sm text-muted-foreground">
            Tempo em fila, tempo com atendente, atrasos e ranking por prioridade. Atualização automática a cada 20s.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Conversas ativas</div>
          <div className="text-2xl font-semibold">{stats.total}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-destructive" /> Atrasadas</div>
          <div className="text-2xl font-semibold text-destructive">{stats.breached}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><Timer className="w-3 h-3" /> Em risco</div>
          <div className="text-2xl font-semibold">{stats.at_risk}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Espera média</div>
          <div className="text-2xl font-semibold">{formatDuration(stats.avgWait)}</div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 8 — ranking por prioridade</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ranking.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conversa ativa.</p>}
          {ranking.map((r, i) => (
            <div key={r.contact_id} className="flex items-center gap-3 p-2 rounded-md border">
              <div className="text-xs font-mono w-6 text-muted-foreground">#{i + 1}</div>
              <Badge variant={r.priority === "critical" ? "destructive" : "secondary"}>{PRIORITY_LABEL[r.priority]}</Badge>
              <div className="flex-1 min-w-0">
                <Link to={`/inbox?contact=${r.contact_id}`} className="text-sm font-medium hover:underline truncate block">
                  {r.contact_name || r.contact_phone || "Sem nome"}
                </Link>
                <div className="text-xs text-muted-foreground truncate">
                  {r.queue_name ?? "sem fila"} · {r.channel_type ?? "—"} · agente: {r.agent_name ?? "não atribuído"}
                </div>
              </div>
              <div className="text-right">
                <Badge variant={STATUS_VARIANT[r.sla_status]}>{STATUS_LABEL[r.sla_status]}</Badge>
                <div className="text-xs text-muted-foreground mt-1">espera {formatDuration(r.wait_seconds)}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base">Conversas em atendimento</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome ou telefone"
                className="pl-8 w-56"
              />
            </div>
            <Select value={status} onValueChange={(v) => setStatus(v as SlaStatus | "all")}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="on_track">No prazo</SelectItem>
                <SelectItem value="at_risk">Em risco</SelectItem>
                <SelectItem value="breached">Atrasados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => setPriority(v as SlaPriority | "all")}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas prioridades</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-sm text-destructive mb-3">Erro ao carregar: {error}</div>
          )}
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>Fila / Canal</TableHead>
                  <TableHead>Agente</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Em fila</TableHead>
                  <TableHead>Com agente</TableHead>
                  <TableHead className="min-w-[160px]">SLA 1ª resposta</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando…</TableCell></TableRow>
                )}
                {!loading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma conversa encontrada.</TableCell></TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.contact_id}>
                    <TableCell>
                      <Link to={`/inbox?contact=${r.contact_id}`} className="font-medium hover:underline">
                        {r.contact_name || "Sem nome"}
                      </Link>
                      <div className="text-xs text-muted-foreground">{r.contact_phone ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.queue_color && (
                          <span className="w-2 h-2 rounded-full" style={{ background: r.queue_color }} />
                        )}
                        <span className="text-sm">{r.queue_name ?? "—"}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">{r.channel_type ?? "—"}</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{r.agent_name ?? <span className="text-muted-foreground">não atribuído</span>}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.priority === "critical" ? "destructive" : "secondary"}>
                        {PRIORITY_LABEL[r.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDuration(r.wait_seconds)}</TableCell>
                    <TableCell className="text-sm">{formatDuration(r.handle_seconds)}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Progress
                          value={Math.min(100, Number(r.sla_progress_pct) || 0)}
                          className={r.sla_status === "breached" ? "[&>div]:bg-destructive" : ""}
                        />
                        <div className="text-xs text-muted-foreground">
                          {r.first_response_at
                            ? `respondido em ${formatDuration(r.first_response_seconds ?? 0)}`
                            : `meta ${r.first_response_minutes}m`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.sla_status]}>{STATUS_LABEL[r.sla_status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
