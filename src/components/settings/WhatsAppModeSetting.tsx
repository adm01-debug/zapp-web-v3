import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getWhatsAppMode,
  invalidateWhatsAppModeCache,
  type WhatsAppMode,
} from "@/lib/whatsappAdapter";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";

/**
 * Seletor de modo WhatsApp (Oficial Cloud API vs Não-oficial Evolution).
 * Persistência por workspace via `global_settings.whatsapp_mode` (RPC `rpc_set_whatsapp_mode`).
 * Reusa a mesma fonte de verdade da página /admin/whatsapp-mode.
 */
export function WhatsAppModeSetting() {
  const [mode, setMode] = useState<WhatsAppMode>("unofficial");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const m = await getWhatsAppMode(true);
      setMode(m);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleToggle = async (checked: boolean) => {
    const next: WhatsAppMode = checked ? "official" : "unofficial";
    const previous = mode;
    setSaving(true);
    setMode(next); // optimistic
    try {
      // deno-lint-ignore no-explicit-any
      const { error } = await supabase.rpc("rpc_set_whatsapp_mode" as any, {
        p_mode: next,
      });
      if (error) throw error;
      invalidateWhatsAppModeCache();
      toast.success(
        next === "official"
          ? "Modo oficial (Cloud API) ativado para o workspace"
          : "Modo não-oficial (Evolution) ativado para o workspace",
      );
    } catch (e) {
      setMode(previous);
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      toast.error(`Falha ao alterar modo: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const Icon = mode === "official" ? ShieldCheck : Zap;

  return (
    <div className="p-3 rounded-lg border border-border/20 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">Modo de WhatsApp</Label>
              <Badge variant={mode === "official" ? "default" : "secondary"} className="text-[10px]">
                {mode === "official" ? "Oficial" : "Não-oficial"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === "official"
                ? "Envios e webhooks via WhatsApp Cloud API (Meta). Requer templates aprovados fora da janela 24h."
                : "Envios e webhooks via Evolution API (Baileys). Sem limites de templates."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(loading || saving) && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          <Switch
            checked={mode === "official"}
            disabled={loading || saving}
            onCheckedChange={handleToggle}
            aria-label="Alternar para modo oficial Cloud API"
          />
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground/80 pl-7">
        Preferência salva por workspace. Alterações afetam todos os usuários imediatamente.
      </p>
    </div>
  );
}
