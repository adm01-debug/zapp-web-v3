import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Sparkles, Tag, Send, Clock, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TriggerType =
  | "first_response_pending"
  | "inactivity"
  | "tag_applied"
  | "tag_removed"
  | "keyword_match";

interface Rule {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  trigger_type: TriggerType;
  trigger_config: any;
  actions: any;
  priority: number;
  cooldown_seconds: number;
}

const TRIGGER_LABEL: Record<TriggerType, string> = {
  first_response_pending: "Primeira resposta pendente",
  inactivity: "Ausência / inatividade",
  tag_applied: "Etiqueta aplicada",
  tag_removed: "Etiqueta removida",
  keyword_match: "Palavra-chave",
};

const EMPTY_RULE: Omit<Rule, "id"> = {
  name: "",
  description: "",
  is_active: true,
  trigger_type: "first_response_pending",
  trigger_config: { threshold_seconds: 60 },
  actions: {
    suggest_reply: true,
    auto_send: false,
    apply_tags: [] as string[],
    ai_prompt: "",
    template: "",
  },
  priority: 100,
  cooldown_seconds: 300,
};

export default function AdminAutomationsPage() {
  const { toast } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<Rule | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("automation_rules")
      .select("*")
      .order("priority", { ascending: true });
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setRules((data ?? []) as Rule[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startNew = () => {
    setEditing({ ...(EMPTY_RULE as Rule), id: "" });
    setOpen(true);
  };

  const startEdit = (r: Rule) => {
    setEditing(JSON.parse(JSON.stringify(r)));
    setOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const payload = {
      name: editing.name,
      description: editing.description,
      is_active: editing.is_active,
      trigger_type: editing.trigger_type,
      trigger_config: editing.trigger_config,
      actions: editing.actions,
      priority: editing.priority,
      cooldown_seconds: editing.cooldown_seconds,
    };
    const op = editing.id
      ? supabase.from("automation_rules").update(payload).eq("id", editing.id)
      : supabase.from("automation_rules").insert(payload);
    const { error } = await op;
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Regra salva" });
    setOpen(false);
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover esta regra?")) return;
    const { error } = await supabase.from("automation_rules").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const toggleActive = async (r: Rule) => {
    await supabase
      .from("automation_rules")
      .update({ is_active: !r.is_active })
      .eq("id", r.id);
    load();
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Automações por gatilho
          </h1>
          <p className="text-sm text-muted-foreground">
            Sugestões de resposta com IA, aplicação automática de tags e reatribuição.
          </p>
        </div>
        <Button onClick={startNew}>
          <Plus className="h-4 w-4 mr-1" /> Nova regra
        </Button>
      </div>

      <div className="space-y-3">
        {loading && <p className="text-muted-foreground">Carregando…</p>}
        {!loading && rules.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground">
            Nenhuma regra ainda. Crie a primeira para começar a automatizar.
          </Card>
        )}
        {rules.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{r.name}</h3>
                  <Badge variant={r.is_active ? "default" : "secondary"}>
                    {r.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                  <Badge variant="outline">{TRIGGER_LABEL[r.trigger_type]}</Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    cooldown {r.cooldown_seconds}s
                  </Badge>
                </div>
                {r.description && (
                  <p className="text-sm text-muted-foreground mb-2">{r.description}</p>
                )}
                <div className="flex flex-wrap gap-1 text-xs">
                  {r.actions?.suggest_reply && (
                    <Badge variant="secondary"><Sparkles className="h-3 w-3 mr-1" />Sugerir</Badge>
                  )}
                  {r.actions?.auto_send && (
                    <Badge variant="secondary"><Send className="h-3 w-3 mr-1" />Auto-enviar</Badge>
                  )}
                  {Array.isArray(r.actions?.apply_tags) && r.actions.apply_tags.length > 0 && (
                    <Badge variant="secondary">
                      <Tag className="h-3 w-3 mr-1" />
                      {r.actions.apply_tags.join(", ")}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                <Button size="icon" variant="ghost" onClick={() => startEdit(r)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(r.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar regra" : "Nova regra"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  rows={2}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Gatilho</Label>
                  <Select
                    value={editing.trigger_type}
                    onValueChange={(v: TriggerType) =>
                      setEditing({ ...editing, trigger_type: v, trigger_config: {} })
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRIGGER_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Input
                    type="number"
                    value={editing.priority}
                    onChange={(e) =>
                      setEditing({ ...editing, priority: Number(e.target.value) || 100 })
                    }
                  />
                </div>
              </div>

              {/* Config por tipo */}
              {(editing.trigger_type === "first_response_pending" ||
                editing.trigger_type === "inactivity") && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Tempo (segundos)</Label>
                    <Input
                      type="number"
                      value={editing.trigger_config?.threshold_seconds ?? 60}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          trigger_config: {
                            ...editing.trigger_config,
                            threshold_seconds: Number(e.target.value) || 60,
                          },
                        })
                      }
                    />
                  </div>
                  {editing.trigger_type === "inactivity" && (
                    <div>
                      <Label>De quem?</Label>
                      <Select
                        value={editing.trigger_config?.side ?? "any"}
                        onValueChange={(v) =>
                          setEditing({
                            ...editing,
                            trigger_config: { ...editing.trigger_config, side: v },
                          })
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Qualquer lado</SelectItem>
                          <SelectItem value="client">Cliente parou</SelectItem>
                          <SelectItem value="agent">Agente parou</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {editing.trigger_type === "keyword_match" && (
                <div>
                  <Label>Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    value={(editing.trigger_config?.keywords ?? []).join(", ")}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        trigger_config: {
                          ...editing.trigger_config,
                          keywords: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                    placeholder="orçamento, cancelar, reembolso"
                  />
                </div>
              )}

              {(editing.trigger_type === "tag_applied" ||
                editing.trigger_type === "tag_removed") && (
                <div>
                  <Label>Etiqueta alvo</Label>
                  <Input
                    value={editing.trigger_config?.tag ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        trigger_config: { ...editing.trigger_config, tag: e.target.value },
                      })
                    }
                    placeholder="Ex: vip"
                  />
                </div>
              )}

              {/* Ações */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium text-sm">Ações</h4>

                <div className="flex items-center justify-between">
                  <Label>Sugerir resposta (rascunho)</Label>
                  <Switch
                    checked={!!editing.actions.suggest_reply}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, actions: { ...editing.actions, suggest_reply: v } })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enviar resposta automaticamente</Label>
                  <Switch
                    checked={!!editing.actions.auto_send}
                    onCheckedChange={(v) =>
                      setEditing({ ...editing, actions: { ...editing.actions, auto_send: v } })
                    }
                  />
                </div>

                <div>
                  <Label>Tags a aplicar (separadas por vírgula)</Label>
                  <Input
                    value={(editing.actions.apply_tags ?? []).join(", ")}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        actions: {
                          ...editing.actions,
                          apply_tags: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Template fixo (opcional — pula IA)</Label>
                  <Textarea
                    rows={2}
                    value={editing.actions.template ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        actions: { ...editing.actions, template: e.target.value },
                      })
                    }
                    placeholder="Olá! Recebemos sua mensagem e vamos responder em breve."
                  />
                </div>

                <div>
                  <Label>Instrução adicional para a IA (opcional)</Label>
                  <Textarea
                    rows={2}
                    value={editing.actions.ai_prompt ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        actions: { ...editing.actions, ai_prompt: e.target.value },
                      })
                    }
                    placeholder="Ex: Sempre confirmar prazo de 24h e oferecer o catálogo."
                  />
                </div>

                <div>
                  <Label>Cooldown (segundos)</Label>
                  <Input
                    type="number"
                    value={editing.cooldown_seconds}
                    onChange={(e) =>
                      setEditing({ ...editing, cooldown_seconds: Number(e.target.value) || 300 })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tempo mínimo entre disparos da mesma regra na mesma conversa.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
