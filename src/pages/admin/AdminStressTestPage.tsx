/**
 * AdminStressTestPage — painel admin para teste de carga multimídia do WhatsApp.
 *
 * Dispara N envios reais para um destino, alternando entre todos os tipos de mídia
 * suportados pelo hub `evolution-api`. Salva o histórico em `stress_test_runs`.
 *
 * Salvaguardas:
 *  - Confirmação dupla com palavra-chave antes de iniciar
 *  - Botão Parar sempre disponível durante a execução
 *  - Política de falha configurável (padrão: parar na 1ª)
 *  - Persistência do log para auditoria
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Play, Square, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { runStressTest, type RunSummary } from '@/lib/stressTest/runner';
import {
  ALL_STRESS_TYPES, STRESS_TYPE_LABEL,
  type StressResult, type StressRunStatus, type StressTaskType,
} from '@/lib/stressTest/types';
import { buildBalancedPlan, preloadLibraries, sampleFor } from '@/lib/stressTest/mediaSamplers';
import { getLogger } from '@/lib/logger';
import { cn } from '@/lib/utils';

const log = getLogger('AdminStressTest');

const DEFAULT_PHONE = '5564984450900';
const DEFAULT_INSTANCE = 'wpp2';

export default function AdminStressTestPage() {
  // Form
  const [phone, setPhone] = useState(DEFAULT_PHONE);
  const [instance, setInstance] = useState(DEFAULT_INSTANCE);
  const [total, setTotal] = useState(200);
  const [intervalSec, setIntervalSec] = useState(5);
  const [failurePolicy, setFailurePolicy] = useState<'stop_first' | 'continue' | 'stop_after_n'>('stop_first');

  // Run state
  const [status, setStatus] = useState<StressRunStatus>('idle');
  const [results, setResults] = useState<StressResult[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const evo = useEvolutionApi();

  const sent = results.filter((r) => r.status === 'ok').length;
  const failed = results.filter((r) => r.status === 'fail').length;
  const etaMin = useMemo(() => Math.ceil((total * (intervalSec + 1)) / 60), [total, intervalSec]);

  // ── Dispatcher ─────────────────────────────────────────────
  const dispatch = useCallback(async ({ type, idx, phone, instance }: {
    type: StressTaskType; idx: number; phone: string; instance: string;
  }) => {
    const sample = await sampleFor(type, idx);
    let messageId: string | undefined;
    let result: any;

    switch (type) {
      case 'text':
        result = await evo.sendTextMessage(instance, phone, sample.text!);
        break;
      case 'image':
        result = await evo.sendMediaMessage({
          instanceName: instance, number: phone,
          mediatype: 'image', mimetype: 'image/jpeg', media: sample.url!,
          fileName: sample.fileName, caption: sample.caption,
        } as any);
        break;
      case 'video':
        result = await evo.sendMediaMessage({
          instanceName: instance, number: phone,
          mediatype: 'video', mimetype: 'video/mp4', media: sample.url!,
          fileName: sample.fileName, caption: sample.caption,
        } as any);
        break;
      case 'document':
        result = await evo.sendMediaMessage({
          instanceName: instance, number: phone,
          mediatype: 'document', mimetype: 'application/pdf', media: sample.url!,
          fileName: sample.fileName, caption: sample.caption,
        } as any);
        break;
      case 'audio_voice':
      case 'audio_meme':
        result = await evo.sendAudioMessage(instance, phone, sample.url!, { encoding: true });
        break;
      case 'sticker':
        result = await evo.sendStickerMessage(instance, phone, sample.url!);
        break;
      case 'location':
        result = await evo.sendLocationMessage({
          instanceName: instance, number: phone,
          latitude: sample.latitude, longitude: sample.longitude, name: sample.name,
        } as any);
        break;
    }
    messageId = result?.key?.id ?? result?.messageId ?? result?.id;
    return { messageId, detail: sample.detail };
  }, [evo]);

  // ── Persist incremental updates to stress_test_runs ───────
  const persistRun = useCallback(async (
    id: string, partial: Partial<{ status: string; ended_at: string; total_sent: number; total_failed: number; results: StressResult[]; abort_reason: string }>
  ) => {
    try {
      await supabase.from('stress_test_runs').update(partial as any).eq('id', id);
    } catch (e) {
      log.warn('Falha ao persistir progresso', e);
    }
  }, []);

  // ── Start ─────────────────────────────────────────────────
  const startRun = useCallback(async () => {
    setConfirmOpen(false);
    setConfirmText('');
    setResults([]);
    setProgress({ done: 0, total });
    setStatus('running');

    try {
      // Falha cedo se a biblioteca não tem stickers/áudios memes.
      await preloadLibraries();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao carregar bibliotecas';
      toast.error(msg);
      setStatus('failed');
      return;
    }

    const { data: userResp } = await supabase.auth.getUser();
    const userId = userResp.user?.id;
    if (!userId) {
      toast.error('Sessão inválida — faça login novamente.');
      setStatus('idle');
      return;
    }

    // Cria o registro do run
    const { data: insertData, error: insertErr } = await supabase
      .from('stress_test_runs')
      .insert({
        started_by: userId,
        target_phone: phone,
        instance_name: instance,
        total_planned: total,
        status: 'running',
      })
      .select('id')
      .single();

    if (insertErr || !insertData) {
      toast.error(`Não foi possível criar o registro do teste: ${insertErr?.message ?? 'desconhecido'}`);
      setStatus('failed');
      return;
    }

    const id = insertData.id;
    setRunId(id);

    const plan = buildBalancedPlan(total, ALL_STRESS_TYPES);
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const collected: StressResult[] = [];
    let lastPersist = 0;

    const summary: RunSummary = await runStressTest({
      plan,
      phone,
      instance,
      intervalMs: intervalSec * 1000,
      failurePolicy,
      failureThreshold: 5,
      signal: ctrl.signal,
      dispatch,
      onResult: (r) => {
        collected.push(r);
        setResults((prev) => [r, ...prev].slice(0, 250));
        // Persiste a cada 5 envios pra reduzir tráfego
        if (collected.length - lastPersist >= 5) {
          lastPersist = collected.length;
          void persistRun(id, {
            total_sent: collected.filter((x) => x.status === 'ok').length,
            total_failed: collected.filter((x) => x.status === 'fail').length,
            results: collected,
          });
        }
      },
      onProgress: (done, t) => setProgress({ done, total: t }),
    });

    setStatus(summary.status);
    abortRef.current = null;
    await persistRun(id, {
      status: summary.status,
      ended_at: new Date().toISOString(),
      total_sent: summary.totalSent,
      total_failed: summary.totalFailed,
      results: collected,
      abort_reason: summary.abortReason,
    });

    if (summary.status === 'completed') {
      toast.success(`Teste concluído: ${summary.totalSent}/${total} enviados`);
    } else if (summary.status === 'aborted') {
      toast.message('Teste cancelado pelo operador');
    } else {
      toast.error(`Teste interrompido: ${summary.abortReason ?? 'falha'}`);
    }
  }, [dispatch, failurePolicy, instance, intervalSec, persistRun, phone, total]);

  const handleStop = () => {
    abortRef.current?.abort();
  };

  // Limpa abort se desmontar
  useEffect(() => () => abortRef.current?.abort(), []);

  const isRunning = status === 'running';

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stress Test — WhatsApp Multi-mídia</h1>
        <p className="text-muted-foreground mt-1">
          Dispara mensagens reais de todos os tipos suportados para validar a integração ponta-a-ponta.
        </p>
      </div>

      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Atenção</AlertTitle>
        <AlertDescription>
          Este teste envia mensagens <strong>reais</strong> via Evolution API. Use apenas em destinos consentidos.
          Volume alto pode disparar bloqueio anti-spam da Meta na instância.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
          <CardDescription>Ajuste antes de iniciar — durante a execução os campos ficam travados.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Número de destino (E.164 sem +)</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              disabled={isRunning} placeholder="5564984450900" />
            <p className="text-xs text-muted-foreground">Ex.: 5564984450900 (Brasil + DDD + número)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instance">Instância</Label>
            <Input id="instance" value={instance} onChange={(e) => setInstance(e.target.value)}
              disabled={isRunning} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="total">Total de envios</Label>
            <Input id="total" type="number" min={8} max={500} value={total}
              onChange={(e) => setTotal(Math.max(8, Math.min(500, Number(e.target.value) || 8)))}
              disabled={isRunning} />
            <p className="text-xs text-muted-foreground">8 tipos × {Math.floor(total / 8)} cada (resto rotaciona)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">Intervalo entre envios (segundos)</Label>
            <Input id="interval" type="number" min={1} max={60} value={intervalSec}
              onChange={(e) => setIntervalSec(Math.max(1, Math.min(60, Number(e.target.value) || 5)))}
              disabled={isRunning} />
            <p className="text-xs text-muted-foreground">Mínimo recomendado: 3-5s para evitar ban</p>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Política em caso de falha</Label>
            <Select value={failurePolicy} onValueChange={(v: any) => setFailurePolicy(v)} disabled={isRunning}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="stop_first">Parar imediatamente na 1ª falha</SelectItem>
                <SelectItem value="continue">Continuar — só registrar o erro</SelectItem>
                <SelectItem value="stop_after_n">Parar se 5 falhas seguidas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Execução</CardTitle>
          <CardDescription>
            ETA: ~{etaMin} min &middot; {ALL_STRESS_TYPES.length} tipos: {ALL_STRESS_TYPES.map((t) => STRESS_TYPE_LABEL[t]).join(' · ')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            {!isRunning ? (
              <Button onClick={() => setConfirmOpen(true)} size="lg">
                <Play className="h-4 w-4 mr-2" /> Iniciar teste
              </Button>
            ) : (
              <Button onClick={handleStop} size="lg" variant="destructive">
                <Square className="h-4 w-4 mr-2" /> Parar agora
              </Button>
            )}
            <StatusBadge status={status} />
            {isRunning && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Progresso</span>
              <span className="tabular-nums text-muted-foreground">
                {progress.done}/{progress.total} ({progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%)
              </span>
            </div>
            <Progress value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0} />
            <div className="flex gap-3 text-sm pt-1">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" /> Sucesso: <strong className="tabular-nums">{sent}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <XCircle className="h-4 w-4 text-destructive" /> Falhas: <strong className="tabular-nums">{failed}</strong>
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log ao vivo</CardTitle>
          <CardDescription>Últimos 250 envios (mais recente no topo)</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] rounded-md border bg-muted/20 p-2">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">Nenhum envio ainda.</p>
            ) : (
              <ul className="space-y-1 font-mono text-xs">
                {results.map((r) => (
                  <li
                    key={`${r.idx}-${r.ts}`}
                    className={cn(
                      'flex gap-2 px-2 py-1 rounded',
                      r.status === 'ok' ? 'text-foreground' : 'text-destructive bg-destructive/5',
                    )}
                  >
                    <span className="text-muted-foreground tabular-nums shrink-0">
                      {new Date(r.ts).toLocaleTimeString('pt-BR')}
                    </span>
                    <span className="shrink-0">{r.status === 'ok' ? '✅' : '❌'}</span>
                    <span className="tabular-nums shrink-0">#{String(r.idx + 1).padStart(3, '0')}</span>
                    <span className="shrink-0 w-24">{STRESS_TYPE_LABEL[r.type]}</span>
                    <span className="tabular-nums text-muted-foreground shrink-0">{r.ms}ms</span>
                    <span className="truncate">{r.error ?? r.detail ?? ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> Confirmação obrigatória
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <span className="block">
                Você está prestes a enviar <strong>{total} mensagens reais</strong> para o número{' '}
                <strong>{phone}</strong> via instância <strong>{instance}</strong>.
              </span>
              <span className="block text-amber-600 dark:text-amber-400">
                Risco: bloqueio anti-spam da Meta na instância. Tempo estimado: ~{etaMin} min.
              </span>
              <span className="block pt-2">
                Para confirmar, digite <code className="bg-muted px-1.5 py-0.5 rounded">CONFIRMAR</code> abaixo:
              </span>
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Digite CONFIRMAR"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmOpen(false); setConfirmText(''); }}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={confirmText !== 'CONFIRMAR'}
              onClick={startRun}
            >
              Iniciar envio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: StressRunStatus }) {
  switch (status) {
    case 'idle': return <Badge variant="secondary">Pronto</Badge>;
    case 'running': return <Badge>Rodando…</Badge>;
    case 'completed': return <Badge variant="success">Concluído</Badge>;
    case 'aborted': return <Badge variant="warning">Cancelado</Badge>;
    case 'failed': return <Badge variant="destructive">Interrompido por falha</Badge>;
  }
}
