import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Users, X } from "lucide-react";

interface Queue {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  priority: number;
  max_wait_time_minutes: number;
}

interface Profile { id: string; name: string; avatar_url: string | null }
interface QueueMember { id: string; queue_id: string; profile_id: string; profile?: Profile }
interface QueueSkill { id: string; queue_id: string; skill_name: string; min_level: number }

export default function AdminQueuesPage() {
  const { toast } = useToast();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [members, setMembers] = useState<QueueMember[]>([]);
  const [skills, setSkills] = useState<QueueSkill[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Queue> | null>(null);
  const [memberDialog, setMemberDialog] = useState<Queue | null>(null);
  const [newSkill, setNewSkill] = useState<{ name: string; level: number }>({ name: "", level: 1 });
  const [newMemberId, setNewMemberId] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [q, m, s, p] = await Promise.all([
      supabase.from("queues").select("*").order("priority", { ascending: false }),
      supabase.from("queue_members").select("id,queue_id,profile_id,profile:profiles(id,name,avatar_url)"),
      supabase.from("queue_skill_requirements").select("*"),
      supabase.from("profiles").select("id,name,avatar_url").eq("is_active", true).order("name"),
    ]);
    setQueues((q.data ?? []) as Queue[]);
    setMembers((m.data ?? []) as unknown as QueueMember[]);
    setSkills((s.data ?? []) as QueueSkill[]);
    setProfiles((p.data ?? []) as Profile[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!editing?.name) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    const payload = {
      name: editing.name,
      description: editing.description ?? null,
      color: editing.color ?? "#3B82F6",
      is_active: editing.is_active ?? true,
      priority: editing.priority ?? 0,
      max_wait_time_minutes: editing.max_wait_time_minutes ?? 30,
    };
    const { error } = editing.id
      ? await supabase.from("queues").update(payload).eq("id", editing.id)
      : await supabase.from("queues").insert(payload as never);
    if (error) {
      toast({ title: "Erro ao salvar fila", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing.id ? "Fila atualizada" : "Fila criada" });
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir esta fila? Membros e regras vinculados serão removidos.")) return;
    const { error } = await supabase.from("queues").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const addMember = async () => {
    if (!memberDialog || !newMemberId) return;
    const { error } = await supabase.from("queue_members").insert({
      queue_id: memberDialog.id,
      profile_id: newMemberId,
    } as never);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setNewMemberId("");
    load();
  };

  const removeMember = async (id: string) => {
    await supabase.from("queue_members").delete().eq("id", id);
    load();
  };

  const addSkill = async () => {
    if (!memberDialog || !newSkill.name.trim()) return;
    const { error } = await supabase.from("queue_skill_requirements").insert({
      queue_id: memberDialog.id,
      skill_name: newSkill.name.trim(),
      min_level: newSkill.level,
    } as never);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    setNewSkill({ name: "", level: 1 });
    load();
  };

  const removeSkill = async (id: string) => {
    await supabase.from("queue_skill_requirements").delete().eq("id", id);
    load();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Filas de Atendimento</h1>
          <p className="text-muted-foreground">
            Distribuição com sticky agent + round-robin entre membros qualificados.
          </p>
        </div>
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ is_active: true, color: "#3B82F6", priority: 0, max_wait_time_minutes: 30 })}>
              <Plus className="w-4 h-4 mr-2" /> Nova fila
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Editar fila" : "Nova fila"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={editing?.name ?? ""} onChange={(e) => setEditing({ ...editing!, name: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing!, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cor</Label>
                  <Input type="color" value={editing?.color ?? "#3B82F6"} onChange={(e) => setEditing({ ...editing!, color: e.target.value })} />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Input type="number" value={editing?.priority ?? 0} onChange={(e) => setEditing({ ...editing!, priority: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Tempo máx. de espera (min)</Label>
                <Input type="number" value={editing?.max_wait_time_minutes ?? 30} onChange={(e) => setEditing({ ...editing!, max_wait_time_minutes: Number(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativa</Label>
                <Switch checked={editing?.is_active ?? true} onCheckedChange={(v) => setEditing({ ...editing!, is_active: v })} />
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
          {queues.map((q) => {
            const qMembers = members.filter((m) => m.queue_id === q.id);
            const qSkills = skills.filter((s) => s.queue_id === q.id);
            return (
              <Card key={q.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: q.color }} />
                      {q.name}
                      <Badge variant={q.is_active ? "default" : "secondary"}>
                        prioridade {q.priority}
                      </Badge>
                    </CardTitle>
                    {q.description && <p className="text-sm text-muted-foreground mt-1">{q.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setMemberDialog(q)}>
                      <Users className="w-4 h-4 mr-1" /> Membros & Skills
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setEditing(q)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(q.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{qMembers.length} membros</Badge>
                    {qSkills.map((s) => (
                      <Badge key={s.id} variant="secondary">{s.skill_name} (≥{s.min_level})</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {queues.length === 0 && (
            <p className="text-muted-foreground text-center py-12">Nenhuma fila criada.</p>
          )}
        </div>
      )}

      <Dialog open={!!memberDialog} onOpenChange={(o) => !o && setMemberDialog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{memberDialog?.name} — Membros & Skills</DialogTitle>
          </DialogHeader>
          {memberDialog && (
            <div className="space-y-6">
              <section>
                <h3 className="font-semibold mb-2">Membros</h3>
                <div className="flex gap-2 mb-3">
                  <Select value={newMemberId} onValueChange={setNewMemberId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Adicionar agente" /></SelectTrigger>
                    <SelectContent>
                      {profiles
                        .filter((p) => !members.some((m) => m.queue_id === memberDialog.id && m.profile_id === p.id))
                        .map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button onClick={addMember} disabled={!newMemberId}>Adicionar</Button>
                </div>
                <div className="space-y-1">
                  {members.filter((m) => m.queue_id === memberDialog.id).map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded">
                      <span>{m.profile?.name ?? m.profile_id}</span>
                      <Button size="icon" variant="ghost" onClick={() => removeMember(m.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-semibold mb-2">Skills exigidas</h3>
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Ex.: vendas, suporte, ingles"
                    value={newSkill.name}
                    onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value })}
                  />
                  <Input
                    type="number" min={1} max={5}
                    className="w-20"
                    value={newSkill.level}
                    onChange={(e) => setNewSkill({ ...newSkill, level: Number(e.target.value) })}
                  />
                  <Button onClick={addSkill} disabled={!newSkill.name.trim()}>Adicionar</Button>
                </div>
                <div className="space-y-1">
                  {skills.filter((s) => s.queue_id === memberDialog.id).map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-muted/30 px-3 py-2 rounded">
                      <span>{s.skill_name} <Badge variant="outline" className="ml-2">nível ≥ {s.min_level}</Badge></span>
                      <Button size="icon" variant="ghost" onClick={() => removeSkill(s.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
