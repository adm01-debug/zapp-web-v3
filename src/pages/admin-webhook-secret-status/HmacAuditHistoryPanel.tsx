/**
 * HmacAuditHistoryPanel
 *
 * Lista as últimas execuções do botão "Testar HMAC" gravadas em
 * `hmac_selftest_audit`. Filtra opcionalmente por instância selecionada
 * no painel pai. Atualiza em tempo real via Realtime + invalidação do
 * React Query (debounce 300ms).
 *
 * RLS: somente admin/supervisor enxergam linhas — usuários sem permissão
 * recebem array vazio e o card simplesmente exibe o estado "sem dados".
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, RefreshCw, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface AuditRow {
  id: string;
  instance: string | null;
  ok: boolean;
  duration_ms: number | null;
  error: string | null;
  message: string | null;
  good_accepted: boolean | null;
  tampered_rejected: boolean | null;
  created_at: string;
}

interface Props {
  /** Quando definido, filtra por instância. Quando null, mostra todas. */
  instance?: string | null;
  /** Quantidade máxima de execuções a exibir. */
  limit?: number;
}

function fmtDate(iso: string) {
  try {
    return format(new Date(iso), "dd/MM HH:mm:ss", { locale: ptBR });
  } catch {
    return iso;
  }
}

export function HmacAuditHistoryPanel({ instance = null, limit = 25 }: Props) {
  const queryClient = useQueryClient();
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'live' | 'offline'>('connecting');

  const queryKey = useMemo(
    () => ['hmac-selftest-audit', instance ?? '__all__', limit],
    [instance, limit],
  );

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      let q = supabase
        .from('hmac_selftest_audit')
        .select('id, instance, ok, duration_ms, error, message, good_accepted, tampered_rejected, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (instance) q = q.eq('instance', instance);
      const { data, error } = await q;
      if (error) throw error;
      return (data as AuditRow[]) ?? [];
    },
    staleTime: 5_000,
    refetchInterval: realtimeStatus === 'live' ? 60_000 : 20_000,
  });

  // Realtime subscription — atualiza assim que uma nova execução é gravada.
  const debounceRef = useRef<number | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel('hmac-selftest-audit-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'hmac_selftest_audit' },
        () => {
          if (debounceRef.current) window.clearTimeout(debounceRef.current);
          debounceRef.current = window.setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['hmac-selftest-audit'] });
          }, 300);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeStatus('live');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeStatus('offline');
        } else setRealtimeStatus('connecting');
      });

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const rows = data ?? [];
  const okCount = rows.filter(r => r.ok).length;
  const failCount = rows.length - okCount;
  const avgDuration = rows.length > 0
    ? Math.round(
        rows.reduce((sum, r) => sum + (r.duration_ms ?? 0), 0) / rows.length,
      )
    : 0;

  return (
    <Card data-testid="hmac-audit-history-card">
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de testes HMAC
            {instance && (
              <Badge variant="outline" className="text-[10px] font-normal">
                {instance}
              </Badge>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Últimas {limit} execuções do botão <code>Testar HMAC</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'gap-1.5 text-[10px]',
              realtimeStatus === 'live' && 'border-success/40 bg-success/10 text-success',
              realtimeStatus === 'offline' && 'border-destructive/40 bg-destructive/10 text-destructive',
              realtimeStatus === 'connecting' && 'border-muted-foreground/30 text-muted-foreground',
            )}
            data-testid="hmac-audit-realtime-status"
          >
            <Radio className={cn('w-2.5 h-2.5', realtimeStatus === 'live' && 'animate-pulse')} />
            {realtimeStatus === 'live' ? 'Ao vivo' : realtimeStatus === 'connecting' ? '…' : 'Offline'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="hmac-audit-refresh"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-lg border p-2">
            <div className="text-[10px] uppercase text-muted-foreground">OK</div>
            <div className="text-lg font-bold text-success" data-testid="hmac-audit-ok-count">{okCount}</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Falhas</div>
            <div className="text-lg font-bold text-destructive" data-testid="hmac-audit-fail-count">{failCount}</div>
          </div>
          <div className="rounded-lg border p-2">
            <div className="text-[10px] uppercase text-muted-foreground">Duração média</div>
            <div className="text-lg font-bold" data-testid="hmac-audit-avg-duration">
              {avgDuration}<span className="text-xs ml-1 text-muted-foreground">ms</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Carregando…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded">
            Nenhuma execução registrada{instance ? ' para esta instância' : ''}.
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Quando</TableHead>
                  <TableHead className="text-xs">Instância</TableHead>
                  <TableHead className="text-xs">Resultado</TableHead>
                  <TableHead className="text-xs text-right">Duração</TableHead>
                  <TableHead className="text-xs">Detalhe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} data-testid="hmac-audit-row" data-result={r.ok ? 'ok' : 'fail'}>
                    <TableCell className="text-xs whitespace-nowrap">{fmtDate(r.created_at)}</TableCell>
                    <TableCell className="text-xs">
                      <code className="text-[11px]">{r.instance ?? '—'}</code>
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.ok ? 'default' : 'destructive'} className="text-[10px]">
                        {r.ok ? 'OK' : 'FALHA'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-right tabular-nums">
                      {r.duration_ms ?? '—'}<span className="text-muted-foreground ml-0.5">ms</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate" title={r.error ?? r.message ?? ''}>
                      {r.error ?? r.message ?? (r.tampered_rejected === false
                        ? '⚠ assinatura adulterada foi aceita'
                        : '—')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
