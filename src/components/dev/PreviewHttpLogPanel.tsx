import { useEffect, useMemo, useState } from 'react';
import { Bug, X, Trash2, Copy, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import {
  getPreviewHttpLogs,
  clearPreviewHttpLogs,
  type PreviewHttpLogEntry,
} from '@/lib/previewHttpLogger';

function isPreviewHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  const flag = (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_ENABLE_PREVIEW_HTTP_LOGGER;
  if (flag === 'true') return true;
  return /(^|\.)lovable\.app$/.test(host) || /(^|\.)lovableproject\.com$/.test(host);
}

/**
 * Painel flutuante (canto inferior direito) que mostra em tempo real
 * todos os erros HTTP capturados pelo `previewHttpLogger`. Visível só
 * no preview Lovable. Útil para diagnosticar 412 / Failed to fetch
 * causados pelo proxy do iframe sem precisar abrir devtools.
 */
export function PreviewHttpLogPanel() {
  const [enabled] = useState(() => isPreviewHost());
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<PreviewHttpLogEntry[]>(() => getPreviewHttpLogs());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | '412' | '4xx' | '5xx' | 'network'>('all');

  useEffect(() => {
    if (!enabled) return;
    const onLog = () => setLogs(getPreviewHttpLogs());
    const onCleared = () => setLogs([]);
    document.addEventListener('preview-http-log', onLog);
    document.addEventListener('preview-http-log-cleared', onCleared);
    return () => {
      document.removeEventListener('preview-http-log', onLog);
      document.removeEventListener('preview-http-log-cleared', onCleared);
    };
  }, [enabled]);

  const filtered = useMemo(() => {
    const list = logs.slice().reverse();
    if (filter === 'all') return list;
    if (filter === '412') return list.filter((l) => l.status === 412);
    if (filter === '4xx') return list.filter((l) => l.status >= 400 && l.status < 500);
    if (filter === '5xx') return list.filter((l) => l.status >= 500);
    if (filter === 'network') return list.filter((l) => l.status === 0);
    return list;
  }, [logs, filter]);

  const counts = useMemo(() => {
    let p412 = 0;
    let net = 0;
    for (const l of logs) {
      if (l.status === 412) p412 += 1;
      if (l.status === 0) net += 1;
    }
    return { total: logs.length, p412, net };
  }, [logs]);

  if (!enabled) return null;

  const copyEntry = async (entry: PreviewHttpLogEntry) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
    } catch {
      /* noop */
    }
  };

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir painel de logs HTTP do preview"
        className="fixed bottom-4 right-4 z-[9998] h-11 w-11 rounded-full bg-foreground/90 text-background shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
      >
        <Bug className="h-5 w-5" />
        {counts.p412 > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {counts.p412}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Logs HTTP do preview"
          className="fixed bottom-20 right-4 z-[9998] w-[min(560px,calc(100vw-2rem))] max-h-[70vh] rounded-xl border border-border bg-background shadow-2xl flex flex-col overflow-hidden"
        >
          <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-muted/40">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h2 className="text-sm font-semibold text-foreground truncate">
                Preview HTTP Logs
              </h2>
              <span className="text-[11px] text-muted-foreground">
                {counts.total} eventos · 412: {counts.p412} · net: {counts.net}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearPreviewHttpLogs}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                aria-label="Limpar logs"
                title="Limpar"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                aria-label="Fechar painel"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </header>

          <div className="flex items-center gap-1 px-3 py-2 border-b border-border text-[11px]">
            {(['all', '412', '4xx', '5xx', 'network'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2 py-0.5 rounded-md font-medium ${
                  filter === f
                    ? 'bg-foreground text-background'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Nenhum erro HTTP capturado ainda. Interaja com o app — qualquer 4xx/5xx
                ou falha de rede aparecerá aqui em tempo real.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  const statusClass =
                    entry.status === 412
                      ? 'bg-destructive text-destructive-foreground'
                      : entry.status >= 500
                        ? 'bg-destructive/80 text-destructive-foreground'
                        : entry.status >= 400
                          ? 'bg-warning text-warning-foreground'
                          : entry.status === 0
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-muted text-foreground';
                  return (
                    <li key={entry.id} className="text-xs">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                        className="w-full flex items-start gap-2 px-3 py-2 hover:bg-muted/40 text-left"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${statusClass}`}
                        >
                          {entry.status || 'NET'}
                        </span>
                        <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                          {entry.method}
                        </span>
                        <span className="flex-1 min-w-0 truncate text-foreground">
                          {entry.url}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {entry.durationMs}ms
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2 bg-muted/20">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(entry.timestamp).toLocaleTimeString()} ·{' '}
                              {entry.statusText || '—'}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyEntry(entry)}
                              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              <Copy className="h-3 w-3" /> Copiar JSON
                            </button>
                          </div>
                          <Section title="Request headers" obj={entry.requestHeaders} />
                          <Section title="Response headers" obj={entry.responseHeaders} />
                          {entry.responseBodyPreview && (
                            <div>
                              <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                                Response body (preview)
                              </p>
                              <pre className="text-[10px] font-mono whitespace-pre-wrap break-words bg-background border border-border rounded p-2 max-h-40 overflow-y-auto">
                                {entry.responseBodyPreview}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Section({ title, obj }: { title: string; obj: Record<string, string> }) {
  const entries = Object.entries(obj);
  if (entries.length === 0) return null;
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground mb-1">{title}</p>
      <div className="bg-background border border-border rounded p-2 space-y-0.5 max-h-40 overflow-y-auto">
        {entries.map(([k, v]) => (
          <div key={k} className="text-[10px] font-mono break-all">
            <span className="text-muted-foreground">{k}:</span>{' '}
            <span className="text-foreground">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
