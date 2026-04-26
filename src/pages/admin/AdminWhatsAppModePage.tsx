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
import { Copy, Loader2, ShieldCheck, Zap, AlertTriangle } from "lucide-react";

export default function AdminWhatsAppModePage() {
  const { toast } = useToast();
  const [mode, setMode] = useState<WhatsAppMode>("unofficial");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const webhookUrl = getCloudWebhookUrl();

  const refresh = useCallback(async () => {
    setLoading(true);
    const m = await getWhatsAppMode(true);
    setMode(m);
    setLoading(false);
  }, []);

  useEffect(() => {
    document.title = "Modo WhatsApp — Oficial vs Não-oficial";
    refresh();
  }, [refresh]);

  const handleToggle = async (checked: boolean) => {
    const next: WhatsAppMode = checked ? "official" : "unofficial";
    setSaving(true);
    try {
      const { error } = await supabase.rpc("rpc_set_whatsapp_mode" as any, {
        p_mode: next,
      });
      if (error) throw error;
      invalidateWhatsAppModeCache();
      setMode(next);
      toast({
        title: "Modo atualizado",
        description:
          next === "official"
            ? "Sistema agora envia via WhatsApp Cloud API (oficial)."
            : "Sistema agora envia via Evolution API (não-oficial).",
      });
    } catch (e: any) {
      toast({
        title: "Falha ao atualizar modo",
        description: e?.message ?? "Erro desconhecido",
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Modo de WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Define como mensagens são enviadas e recebidas em todo o sistema.
        </p>
      </header>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                {mode === "official" ? (
                  <ShieldCheck className="h-5 w-5 text-primary" />
                ) : (
                  <Zap className="h-5 w-5 text-primary" />
                )}
                Modo ativo:{" "}
                <Badge variant={mode === "official" ? "default" : "secondary"}>
                  {mode === "official" ? "Oficial (Cloud API)" : "Não-oficial (Evolution)"}
                </Badge>
              </CardTitle>
              <CardDescription>
                A alternância afeta envios, webhooks e templates em tempo real.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {(loading || saving) && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              <Switch
                checked={mode === "official"}
                disabled={loading || saving}
                onCheckedChange={handleToggle}
                aria-label="Alternar modo oficial"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" /> Não-oficial (Evolution API)
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Envio via Evolution proxy (instância wpp2)</li>
                <li>Webhook: <code>/functions/v1/evolution-webhook</code></li>
                <li>Sem limites de templates / janelas 24h</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4 space-y-2">
              <h3 className="font-medium flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" /> Oficial (Cloud API)
              </h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Envio direto à Graph API da Meta</li>
                <li>Webhook: <code>/functions/v1/whatsapp-cloud-webhook</code></li>
                <li>Suporta templates aprovados e janela 24h</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {mode === "official" && (
        <Card>
          <CardHeader>
            <CardTitle>Configuração no Meta Business</CardTitle>
            <CardDescription>
              Cole estes valores no painel do app WhatsApp Business no Meta Developers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Callback URL do Webhook</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} />
                <Button variant="outline" size="icon" onClick={() => copy(webhookUrl)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Credenciais armazenadas em secrets</AlertTitle>
              <AlertDescription className="text-sm">
                Phone Number ID, Access Token e Verify Token são guardados como
                secrets do projeto (<code>WHATSAPP_CLOUD_*</code>). Sem eles, envios
                no modo oficial retornam <code>cloud_api_not_configured</code>.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
