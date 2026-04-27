import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getWhatsAppMode,
  invalidateWhatsAppModeCache,
  getCloudWebhookUrl,
  type WhatsAppMode,
} from "@/lib/whatsappAdapter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Copy, Loader2, ShieldCheck, Zap, AlertTriangle, CheckCircle2,
  XCircle, ExternalLink, RefreshCw, Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PingRow { kind: string; meta: Record<string, unknown>; created_at: string }
interface VerifyResult {
  verifyTokenConfigured: boolean;
  webhookUrl: string;
  handshake: { status: "pass" | "fail" | "skip"; httpStatus?: number; echoMatches?: boolean; durationMs?: number; error?: string };
  delivery: {
    status: "pass" | "warn";
    lastEventAt: string | null;
    lastHandshakeAt: string | null;
    counts24h: { handshake: number; event: number; invalid_signature: number; invalid_token: number };
    message: string;
    recent: PingRow[];
  };
  checkedAt: string;
}

interface SecretStatus {
  name: string;
  configured: boolean;
  length: number;
}

const SECRET_DOCS: Record<string, { label: string; description: string; where: string }> = {
  WHATSAPP_CLOUD_PHONE_NUMBER_ID: {
    label: "Phone Number ID",
    description: "ID do número do WhatsApp Business no Meta.",
    where: "Meta for Developers → seu app → WhatsApp → API Setup → Phone number ID",
  },
  WHATSAPP_CLOUD_ACCESS_TOKEN: {
    label: "Access Token",
    description: "Token permanente do System User com permissão whatsapp_business_messaging.",
    where: "Business Manager → Configurações de Negócios → Usuários do Sistema → Gerar token",
  },
  WHATSAPP_CLOUD_WEBHOOK_VERIFY_TOKEN: {
    label: "Webhook Verify Token",
    description: "String secreta que a Meta usa no handshake (GET /webhook).",
    where: "Você define livremente (ex.: UUID). Cole o mesmo valor no painel do app Meta.",
  },
  WHATSAPP_CLOUD_APP_SECRET: {
    label: "App Secret",
    description: "Chave secreta do app — usada para validar X-Hub-Signature-256 nos webhooks.",
    where: "Meta for Developers → seu app → Configurações → Básico → Chave secreta",
  },
};

export default function AdminWhatsAppModePage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<WhatsAppMode>("unofficial");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [secrets, setSecrets] = useState<SecretStatus[] | null>(null);
  const [secretsLoading, setSecretsLoading] = useState(false);
  const webhookUrl = getCloudWebhookUrl();

  const refresh = useCallback(async () => {
    setLoading(true);
    const m = await getWhatsAppMode(true);
    setMode(m);
    setLoading(false);
  }, []);

  const refreshSecrets = useCallback(async () => {
    setSecretsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-cloud-secrets-status");
      if (error) throw error;
      setSecrets((data as { secrets: SecretStatus[] }).secrets);
    } catch (e) {
      toast({
        title: "Falha ao consultar secrets",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSecretsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    document.title = "Modo WhatsApp — Configurações";
    refresh();
    refreshSecrets();
  }, [refresh, refreshSecrets]);

  const handleToggle = async (checked: boolean) => {
    const next: WhatsAppMode = checked ? "official" : "unofficial";
    setSaving(true);
    try {
      // deno-lint-ignore no-explicit-any
      const { error } = await supabase.rpc("rpc_set_whatsapp_mode" as any, { p_mode: next });
      if (error) throw error;
      invalidateWhatsAppModeCache();
      setMode(next);
      toast({
        title: "Modo atualizado",
        description: next === "official"
          ? "Sistema agora envia via WhatsApp Cloud API (oficial)."
          : "Sistema agora envia via Evolution API (não-oficial).",
      });
    } catch (e) {
      toast({
        title: "Falha ao atualizar modo",
        description: e instanceof Error ? e.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: text });
  };

  const allConfigured = secrets ? secrets.every((s) => s.configured) : false;
  const missingCount = secrets ? secrets.filter((s) => !s.configured).length : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Modo de WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Define como mensagens são enviadas e recebidas, e configura as credenciais do modo oficial.
        </p>
      </header>

      {/* ---- Seletor de modo ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                {mode === "official" ? <ShieldCheck className="h-5 w-5 text-primary" /> : <Zap className="h-5 w-5 text-primary" />}
                Modo ativo:{" "}
                <Badge variant={mode === "official" ? "default" : "secondary"}>
                  {mode === "official" ? "Oficial (Cloud API)" : "Não-oficial (Evolution)"}
                </Badge>
              </CardTitle>
              <CardDescription>A alternância afeta envios, webhooks e templates em tempo real.</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {(loading || saving) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                checked={mode === "official"}
                disabled={loading || saving}
                onCheckedChange={handleToggle}
                aria-label="Alternar modo oficial"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-medium flex items-center gap-2"><Zap className="h-4 w-4" /> Não-oficial (Evolution)</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Envio via Evolution proxy (instância wpp2)</li>
                <li>Webhook: <code>/functions/v1/evolution-webhook</code></li>
                <li>Sem limites de templates / janelas 24h</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-medium flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Oficial (Cloud API)</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Envio direto à Graph API da Meta</li>
                <li>Webhook: <code>/functions/v1/whatsapp-cloud-webhook</code></li>
                <li>Suporta templates aprovados e janela 24h</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ---- Webhook URL ---- */}
      {mode === "official" && (
        <Card>
          <CardHeader>
            <CardTitle>Configuração no Meta Business</CardTitle>
            <CardDescription>Cole estes valores no painel do app WhatsApp Business no Meta Developers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Callback URL do Webhook</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => copy(webhookUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Cole no campo "Callback URL" e use o mesmo Verify Token configurado abaixo.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ---- Secrets ---- */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Credenciais Cloud API (Secrets)</CardTitle>
              <CardDescription>
                Os valores são guardados como secrets do projeto e nunca aparecem no código.
              </CardDescription>
            </div>
            {secrets && (
              <Badge variant={allConfigured ? "default" : missingCount === secrets.length ? "destructive" : "secondary"}>
                {allConfigured
                  ? "Todas configuradas"
                  : `${secrets.length - missingCount}/${secrets.length} configuradas`}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {secretsLoading && !secrets && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Verificando secrets…
            </div>
          )}

          {secrets?.map((s) => {
            const doc = SECRET_DOCS[s.name];
            return (
              <div
                key={s.name}
                className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border/30 hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {s.configured
                    ? <CheckCircle2 className="h-4 w-4 mt-1 text-emerald-500 shrink-0" />
                    : <XCircle className="h-4 w-4 mt-1 text-destructive shrink-0" />}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{doc?.label ?? s.name}</p>
                      <code className="text-[10px] text-muted-foreground">{s.name}</code>
                      {s.configured && s.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">{s.length} chars</Badge>
                      )}
                    </div>
                    {doc?.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.description}</p>
                    )}
                    {doc?.where && (
                      <p className="text-[11px] text-muted-foreground/70 mt-1">
                        <strong>Onde encontrar:</strong> {doc.where}
                      </p>
                    )}
                  </div>
                </div>
                <Alert className="hidden" />
              </div>
            );
          })}

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Como adicionar/atualizar</AlertTitle>
            <AlertDescription className="text-sm space-y-2">
              <p>
                Por motivos de segurança, secrets são editados num formulário protegido fora desta tela.
                Peça ao Lovable para "configurar os secrets do WhatsApp Cloud" — você receberá um modal seguro
                para colar cada valor sem que ele apareça no chat ou no código.
              </p>
              <Button variant="outline" size="sm" onClick={refreshSecrets} disabled={secretsLoading}>
                {secretsLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                Recarregar status
              </Button>
            </AlertDescription>
          </Alert>

          <p className="text-[11px] text-muted-foreground">
            <ExternalLink className="h-3 w-3 inline mr-1" />
            Após salvar/atualizar qualquer secret, as edge functions o utilizam imediatamente — não há rebuild necessário.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
