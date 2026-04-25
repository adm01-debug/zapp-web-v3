/**
 * HmacSelfTestButton
 * Aciona a edge function `webhook-hmac-selftest` e mostra a resposta detalhada
 * em um Dialog para confirmar se o secret configurado valida assinaturas.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, FlaskConical, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScenarioReport {
  name: string;
  description: string;
  expected: 'accept' | 'reject';
  outcome: 'accept' | 'reject';
  passed: boolean;
  reason: string | null;
  issuedAt: string;
  ageSeconds: number;
  nonce: string;
}

interface SelfTestResult {
  ok: boolean;
  configured: boolean;
  secret_length?: number;
  duration_ms?: number;
  tolerance_seconds?: number;
  scenarios?: ScenarioReport[];
  payload_preview?: Record<string, unknown>;
  payload_bytes?: number;
  computed_signature_prefix?: string;
  good?: { accepted: boolean; signatureFound: boolean; error: string | null };
  tampered?: { accepted: boolean; signatureFound: boolean; error: string | null };
  message?: string;
  error?: string;
}

export function HmacSelfTestButton({ instance }: { instance: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SelfTestResult | null>(null);

  async function logAudit(
    instanceName: string | null,
    payload: SelfTestResult,
    fallbackDurationMs: number,
  ) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return; // Sem usuário autenticado: não tenta gravar (RLS bloquearia).
      await supabase.from('hmac_selftest_audit').insert({
        instance: instanceName,
        ok: !!payload.ok,
        duration_ms: payload.duration_ms ?? fallbackDurationMs,
        error: payload.error ?? null,
        message: payload.message ?? null,
        good_accepted: payload.good?.accepted ?? null,
        tampered_rejected:
          payload.tampered ? !payload.tampered.accepted : null,
        executed_by: uid,
      });
    } catch (err) {
      // Auditoria é best-effort; não interrompe o fluxo do usuário.
      console.warn('[HmacSelfTest] falha ao gravar auditoria', err);
    }
  }

  async function run() {
    setLoading(true);
    setResult(null);
    setOpen(true);
    const startedAt = performance.now();
    try {
      const { data, error } = await supabase.functions.invoke('webhook-hmac-selftest', {
        body: { instance: instance ?? 'selftest' },
      });
      if (error) throw error;
      const r = data as SelfTestResult;
      setResult(r);
      if (r.ok) toast.success('HMAC OK — secret válido');
      else toast.error(r.error ?? 'Falha no auto-teste HMAC');
      await logAudit(instance, r, Math.round(performance.now() - startedAt));
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro inesperado';
      const failure: SelfTestResult = { ok: false, configured: false, error: msg };
      setResult(failure);
      toast.error(msg);
      await logAudit(instance, failure, Math.round(performance.now() - startedAt));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={run} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FlaskConical className="h-4 w-4 mr-2" />}
        Testar HMAC
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {result?.ok ? (
                <ShieldCheck className="h-5 w-5 text-success" />
              ) : (
                <ShieldAlert className="h-5 w-5 text-destructive" />
              )}
              Teste de validação HMAC
            </DialogTitle>
            <DialogDescription>
              Gera um payload sintético, assina com o secret do servidor e valida pelo mesmo
              pipeline do <code>evolution-webhook</code>. O secret nunca é exposto.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="py-10 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Executando…
            </div>
          )}

          {!loading && result && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={result.ok ? 'default' : 'destructive'}>
                  {result.ok ? 'OK' : 'FALHOU'}
                </Badge>
                {typeof result.duration_ms === 'number' && (
                  <span className="text-xs text-muted-foreground">{result.duration_ms}ms</span>
                )}
                {typeof result.secret_length === 'number' && (
                  <span className="text-xs text-muted-foreground">
                    secret: {result.secret_length} bytes
                  </span>
                )}
              </div>

              {result.message && (
                <p className="text-sm text-muted-foreground">{result.message}</p>
              )}
              {result.error && (
                <p className="text-sm text-destructive">{result.error}</p>
              )}

              {result.good && result.tampered && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs uppercase text-muted-foreground mb-1">
                      Assinatura correta
                    </div>
                    <Badge variant={result.good.accepted ? 'default' : 'destructive'} className="text-[10px]">
                      {result.good.accepted ? 'aceita' : 'rejeitada'}
                    </Badge>
                    {result.good.error && (
                      <p className="text-xs text-destructive mt-1">{result.good.error}</p>
                    )}
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs uppercase text-muted-foreground mb-1">
                      Assinatura adulterada
                    </div>
                    <Badge variant={!result.tampered.accepted ? 'default' : 'destructive'} className="text-[10px]">
                      {result.tampered.accepted ? 'aceita (RUIM)' : 'rejeitada (esperado)'}
                    </Badge>
                    {result.tampered.error && (
                      <p className="text-xs text-muted-foreground mt-1">{result.tampered.error}</p>
                    )}
                  </div>
                </div>
              )}

              {typeof result.tolerance_seconds === 'number' && (
                <div className="text-xs text-muted-foreground" data-testid="hmac-selftest-tolerance">
                  Janela de tolerância: <code>{result.tolerance_seconds}s</code> (issuedAt ± janela; nonce único)
                </div>
              )}

              {result.scenarios && result.scenarios.length > 0 && (
                <div className="rounded-lg border overflow-hidden" data-testid="hmac-selftest-scenarios">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 text-muted-foreground">
                      <tr>
                        <th className="text-left px-2 py-1.5 font-medium">Cenário</th>
                        <th className="text-left px-2 py-1.5 font-medium">Esperado</th>
                        <th className="text-left px-2 py-1.5 font-medium">Resultado</th>
                        <th className="text-left px-2 py-1.5 font-medium">Idade</th>
                        <th className="text-left px-2 py-1.5 font-medium">Detalhe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.scenarios.map((s) => (
                        <tr
                          key={s.name}
                          className="border-t"
                          data-testid={`hmac-selftest-scenario-${s.name}`}
                          data-passed={s.passed ? 'true' : 'false'}
                        >
                          <td className="px-2 py-1.5">
                            <div className="font-medium">{s.name}</div>
                            <div className="text-[10px] text-muted-foreground">{s.description}</div>
                          </td>
                          <td className="px-2 py-1.5">
                            <Badge variant="outline" className="text-[10px]">
                              {s.expected === 'accept' ? 'aceitar' : 'rejeitar'}
                            </Badge>
                          </td>
                          <td className="px-2 py-1.5">
                            <Badge
                              variant={s.passed ? 'default' : 'destructive'}
                              className="text-[10px]"
                            >
                              {s.outcome === 'accept' ? 'aceito' : 'rejeitado'}
                            </Badge>
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {s.ageSeconds >= 0 ? `+${s.ageSeconds}s` : `${s.ageSeconds}s`}
                          </td>
                          <td className="px-2 py-1.5 text-muted-foreground">
                            {s.reason ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {result.payload_preview && (
                <div>
                  <div className="text-xs uppercase text-muted-foreground mb-1">
                    Payload de teste (modelo)
                  </div>
                  <pre className="text-[11px] bg-muted/40 rounded p-2 overflow-x-auto">
{JSON.stringify(result.payload_preview, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
