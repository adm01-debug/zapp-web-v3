import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, ArrowRight, Loader2, Smartphone, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  remoteJid: string;
  sourceInstance: string;
  operatorName: string;
}

export function TransferDialog({ 
  open, 
  onOpenChange, 
  conversationId, 
  remoteJid,
  sourceInstance,
  operatorName 
}: TransferDialogProps) {
  const [transferType, setTransferType] = useState<'internal' | 'direct'>('internal');
  const [targetInstance, setTargetInstance] = useState<string>('');
  const [category, setCategory] = useState<string>('outro');
  const [priority, setPriority] = useState<number>(2);
  const [reason, setReason] = useState('');
  const [instances, setInstances] = useState<any[]>([]);
  const [loadingInstances, setLoadingInstances] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Fetch available instances from registry
  useEffect(() => {
    if (!open) return;
    setLoadingInstances(true);
    supabase
      .from('instance_registry')
      .select('instance_name, display_name, department, usage_type')
      .eq('is_active', true)
      .then(({ data }) => {
        setInstances(data || []);
        setLoadingInstances(false);
      });
  }, [open]);

  const handleTransfer = async () => {
    if (!targetInstance || !reason || isTransferring) {
      toast.error('Preencha o destino e o motivo');
      return;
    }
    
    setIsTransferring(true);
    try {
      const { data, error } = await supabase.rpc('fn_create_transfer', {
        p_source_instance: sourceInstance,
        p_target_instance: targetInstance,
        p_remote_jid: remoteJid,
        p_reason: reason,
        p_category: category,
        p_priority: priority,
        p_transfer_type: transferType,
        p_source_operator: operatorName
      });

      if (error) throw error;

      toast.success('Transferência iniciada com sucesso!');
      onOpenChange(false);
      resetState();
    } catch (err: any) {
      toast.error('Erro ao transferir: ' + err.message);
    } finally {
      setIsTransferring(false);
    }
  };

  const resetState = () => {
    setTargetInstance('');
    setReason('');
    setCategory('outro');
    setPriority(2);
    setTransferType('internal');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-whatsapp" />
            Nova Transferência
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Transfer Type */}
          <div className="space-y-2">
            <Label>Tipo de Transferência</Label>
            <RadioGroup
              value={transferType}
              onValueChange={(v: any) => setTransferType(v)}
              className="grid grid-cols-2 gap-4"
            >
              <Label
                htmlFor="internal"
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                  transferType === 'internal' ? 'border-whatsapp bg-whatsapp/5' : 'border-border'
                )}
              >
                <RadioGroupItem value="internal" id="internal" className="sr-only" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Interna (90%)</p>
                  <p className="text-[10px] text-muted-foreground text-pretty">Resolvido pelo depto sem o cliente saber.</p>
                </div>
              </Label>
              <Label
                htmlFor="direct"
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                  transferType === 'direct' ? 'border-whatsapp bg-whatsapp/5' : 'border-border'
                )}
              >
                <RadioGroupItem value="direct" id="direct" className="sr-only" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Direta (10%)</p>
                  <p className="text-[10px] text-muted-foreground text-pretty">Depto assume o chat e fala com o cliente.</p>
                </div>
              </Label>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Target Instance */}
            <div className="space-y-2">
              <Label>Destino</Label>
              <Select value={targetInstance} onValueChange={setTargetInstance}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o depto" />
                </SelectTrigger>
                <SelectContent>
                  {instances.filter(i => i.instance_name !== sourceInstance).map((inst) => (
                    <SelectItem key={inst.instance_name} value={inst.instance_name}>
                      <div className="flex items-center gap-2">
                        {inst.usage_type === 'shared' ? <Building2 className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                        <span>{inst.display_name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de pedido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nf">Nota Fiscal</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="rastreio">Rastreio</SelectItem>
                  <SelectItem value="arte">Artes / Layout</SelectItem>
                  <SelectItem value="gravacao">Gravação</SelectItem>
                  <SelectItem value="producao">Produção</SelectItem>
                  <SelectItem value="orcamento">Orçamento</SelectItem>
                  <SelectItem value="reclamacao">Reclamação</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Prioridade (SLA)</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 4, label: 'P4 - Urgente (2h)', color: 'bg-red-500' },
                { id: 3, label: 'P3 - Alta (4h)', color: 'bg-orange-500' },
                { id: 2, label: 'P2 - Normal (8h)', color: 'bg-blue-500' },
                { id: 1, label: 'P1 - Baixa (24h)', color: 'bg-gray-500' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border text-[10px] font-bold transition-all",
                    priority === p.id 
                      ? "border-whatsapp bg-whatsapp/10 ring-1 ring-whatsapp" 
                      : "border-border hover:bg-muted"
                  )}
                >
                  <div className={cn("w-2 h-2 rounded-full", p.color)} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>Motivo / Descrição</Label>
            <Textarea
              placeholder="Descreva o que o departamento precisa fazer..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!targetInstance || !reason || isTransferring}
              className="bg-whatsapp hover:bg-whatsapp-dark"
            >
              {isTransferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferindo...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Transferir Ticket
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
