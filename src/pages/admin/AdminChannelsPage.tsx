import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

const CHANNEL_TYPES = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "telegram", label: "Telegram" },
  { value: "messenger", label: "Messenger" },
  { value: "webchat", label: "Webchat" },
  { value: "email", label: "Email" },
] as const;

interface Channel {
  id: string;
  name: string;
  channel_type: string;
  status: string;
  is_active: boolean;
}

interface Queue {
  id: string;
  name: string;
  color: string;
}

interface RoutingRule {
  id: string;
  channel_connection_id: string | null;
  queue_id: string | null;
  priority: number;
}

export default function AdminChannelsPage() {
  const { toast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Channel> | null>(null);

  const load = async () => {
    setLoading(true);
    const [c, q, r] = await Promise.all([
      supabase.from("channel_connections").select("id,name,channel_type,status,is_active").order("created_at"),
      supabase.from("queues").select("id,name,color").order("name"),
      supabase.from("channel_routing_rules").select("id,channel_connection_id,queue_id,priority"),
    ]);
    setChannels((c.data ?? []) as Channel[]);
    setQueues((q.data ?? []) as Queue[]);
    setRules((r.data ?? []) as RoutingRule[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name || !editing.channel_type) {
      toast({ title: "Preencha nome e tipo", variant: "destructive" });
      return;
    }
    const payload = {
      name: editing.name,
      channel_type: editing.channel_type as never,
      is_active: editing.is_active ?? true,
      status: editing.status ?? "disconnected",
    };
    const { error } = editing.id
      ? await supabase.from("channel_connections").update(payload as never).eq("id", editing.id)
      : await supabase.from("channel_connections").insert(payload as never);
    if (error) {
      toast({ title: "Erro ao salvar canal", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Canal atualizado" : "Canal criado" });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este canal?")) return;
    const { error } = await supabase.from("channel_connections").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const setDefaultQueue = async (channelId: string, queueId: string | null) => {
    const existing = rules.find((r) => r.channel_connection_id === channelId);
    if (queueId === null) {
      if (existing) await supabase.from("channel_routing_rules").delete().eq("id", existing.id);
    } else if (existing) {
      await supabase.from("channel_routing_rules").update({ queue_id: queueId }).eq("id", existing.id);
    } else {
      const channel = channels.find((c) => c.id === channelId);
      if (!channel) return;
      await supabase.from("channel_routing_rules").insert({
        channel_connection_id: channelId,
        queue_id: queueId,
        channel_type: channel.channel_type as never,
        priority: 0,
      } as never);
    }
    load();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Canais de Atendimento</h1>
          <p className="text-muted-foreground">
            Gerencie canais omnichannel e a fila padrão de cada um.
          </p>
        </div>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ is_active: true, status: "disconnected" })}>
              <Plus className="w-4 h-4 mr-2" /> Novo canal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Editar canal" : "Novo canal"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={editing?.name ?? ""}
                  onChange={(e) => setEditing({ ...editing!, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={editing?.channel_type ?? ""}
                  onValueChange={(v) => setEditing({ ...editing!, channel_type: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Escolha o tipo" /></SelectTrigger>
                  <SelectContent>
                    {CHANNEL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch
                  checked={editing?.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing!, is_active: v })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={save}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : (
        <div className="grid gap-4">
          {channels.map((ch) => {
            const rule = rules.find((r) => r.channel_connection_id === ch.id);
            return (
              <Card key={ch.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {ch.name}
                      <Badge variant={ch.is_active ? "default" : "secondary"}>
                        {ch.channel_type}
                      </Badge>
                      <Badge variant="outline">{ch.status}</Badge>
                    </CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(ch)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(ch.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <Label className="text-xs">Fila padrão</Label>
                  <Select
                    value={rule?.queue_id ?? "none"}
                    onValueChange={(v) => setDefaultQueue(ch.id, v === "none" ? null : v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem fila padrão</SelectItem>
                      {queues.map((q) => (
                        <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            );
          })}
          {channels.length === 0 && (
            <p className="text-muted-foreground text-center py-12">
              Nenhum canal cadastrado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
