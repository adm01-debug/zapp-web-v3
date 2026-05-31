import { useState, useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { GitMerge, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAvatarColor, getInitials } from '@/lib/avatar-colors';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Contact } from './types';
import { dbFrom } from '@/integrations/datasource/db';

interface ContactMergePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onMergeComplete: () => void;
}

const MERGE_FIELDS = [
  { key: 'name', label: 'Nome' },
  { key: 'surname', label: 'Sobrenome' },
  { key: 'nickname', label: 'Apelido' },
  { key: 'phone', label: 'Telefone' },
  { key: 'email', label: 'Email' },
  { key: 'company', label: 'Empresa' },
  { key: 'job_title', label: 'Cargo' },
  { key: 'contact_type', label: 'Tipo' },
  { key: 'avatar_url', label: 'Avatar' },
] as const;

type FieldKey = (typeof MERGE_FIELDS)[number]['key'];

export function ContactMergePanel({
  open,
  onOpenChange,
  contacts,
  onMergeComplete,
}: ContactMergePanelProps) {
  const [merging, setMerging] = useState(false);
  const [selections, setSelections] = useState<Record<FieldKey, number>>(() => {
    const defaults: Record<string, number> = {};
    MERGE_FIELDS.forEach((f) => {
      defaults[f.key] = 0;
    });
    return defaults as Record<FieldKey, number>;
  });

  const [primary, secondary] = useMemo(() => {
    if (contacts.length < 2) return [null, null];
    return [contacts[0], contacts[1]];
  }, [contacts]);

  if (!primary || !secondary) return null;

  const getFieldValue = (contact: Contact, key: FieldKey): string | null => {
    const val = contact[key as keyof Contact];
    if (Array.isArray(val)) return val.join(', ');
    return val as string | null;
  };

  const handleMerge = async () => {
    setMerging(true);
    try {
      const mergedData: Record<string, any> = {};
      MERGE_FIELDS.forEach((f) => {
        const sourceContact = selections[f.key] === 0 ? primary : secondary;
        const val = getFieldValue(sourceContact, f.key);
        if (val) mergedData[f.key] = val;
      });

      // Merge tags
      const allTags = [...new Set([...(primary.tags || []), ...(secondary.tags || [])])];
      mergedData.tags = allTags;

      // Update primary with merged data
      const { error: updateError } = await dbFrom('contacts')
        .update(mergedData as never)
        .eq('id', primary.id);

      if (updateError) throw updateError;

      // Move messages from secondary to primary
      await dbFrom('messages').update({ contact_id: primary.id }).eq('contact_id', secondary.id);

      // Move notes
      await supabase
        .from('contact_notes')
        .update({ contact_id: primary.id })
        .eq('contact_id', secondary.id);

      // Delete secondary
      await dbFrom('contacts').delete().eq('id', secondary.id);

      toast.success('Contatos mesclados com sucesso!');
      onMergeComplete();
      onOpenChange(false);
    } catch (_err) {
      toast.error('Erro ao mesclar contatos');
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Mesclar Contatos
          </DialogTitle>
          <DialogDescription>
            Selecione qual valor manter para cada campo. O histórico será unificado.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[55vh]">
          <div className="space-y-1 pr-4">
            {/* Contact previews */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              {[primary, secondary].map((contact, idx) => {
                const colors = getAvatarColor(contact.name);
                return (
                  <Card
                    key={contact.id}
                    className={cn('border', idx === 0 ? 'border-primary/30' : 'border-border/50')}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={contact.avatar_url || undefined} />
                        <AvatarFallback className={cn(colors.bg, colors.text, 'text-sm font-bold')}>
                          {getInitials(contact.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.phone}</p>
                      </div>
                      {idx === 0 && (
                        <Badge variant="default" className="ml-auto text-[10px]">
                          Principal
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Separator className="my-3" />

            {/* Field-by-field selection */}
            {MERGE_FIELDS.map((field) => {
              const val0 = getFieldValue(primary, field.key);
              const val1 = getFieldValue(secondary, field.key);
              if (!val0 && !val1) return null;

              return (
                <div key={field.key} className="border-b border-border/20 py-2.5 last:border-0">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {field.label}
                  </p>
                  <RadioGroup
                    value={String(selections[field.key])}
                    onValueChange={(v) =>
                      setSelections((prev) => ({ ...prev, [field.key]: Number(v) }))
                    }
                    className="grid grid-cols-2 gap-2"
                  >
                    {[val0, val1].map((val, idx) => (
                      <Label
                        key={idx}
                        htmlFor={`${field.key}-${idx}`}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-all',
                          selections[field.key] === idx
                            ? 'border-primary bg-primary/5'
                            : 'border-border/40 hover:border-border'
                        )}
                      >
                        <RadioGroupItem value={String(idx)} id={`${field.key}-${idx}`} />
                        <span className={cn('truncate', !val && 'italic text-muted-foreground/40')}>
                          {val || '(vazio)'}
                        </span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              );
            })}

            {/* Warning */}
            <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-warning/20 bg-warning/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
              <div className="text-xs text-warning-foreground dark:text-warning-foreground">
                <p className="font-semibold">Atenção: esta ação é irreversível</p>
                <p className="mt-0.5 text-warning-foreground dark:text-warning-foreground">
                  O contato secundário será excluído e seu histórico será migrado para o contato
                  principal.
                </p>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={merging}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} disabled={merging} className="gap-2">
            {merging ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <GitMerge className="h-4 w-4" />
            )}
            Mesclar Contatos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
