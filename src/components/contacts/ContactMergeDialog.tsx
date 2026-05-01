import React, { useState, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Merge, Check, User, GitMerge } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { sanitizeText } from '@/lib/sanitize';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ContactForMerge {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  tags: string[];
  channel: string | null;
  avatar_url: string | null;
  created_at: string;
  conversation_count?: number;
  notes?: string | null;
  lgpd_consent_at?: string | null;
}

type FieldChoice = 'primary' | 'secondary';

interface FieldResolution {
  name: FieldChoice;
  phone: FieldChoice;
  email: FieldChoice;
  company: FieldChoice;
  notes: FieldChoice;
}

interface ContactMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryContact: ContactForMerge;
  secondaryContact: ContactForMerge;
  onMergeComplete: (survivingId: string) => void;
}

// ── Sub-components ─────────────────────────────────────────────────────────

function ContactCard({ contact, label, badge }: {
  contact: ContactForMerge; label: string; badge?: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
        {badge && <Badge variant="secondary">{badge}</Badge>}
      </div>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          {contact.avatar_url
            ? <img src={contact.avatar_url} alt={sanitizeText(contact.name)} className="h-10 w-10 rounded-full object-cover" />
            : <User className="h-5 w-5 text-primary" />}
        </div>
        <div>
          <p className="font-semibold text-sm">{sanitizeText(contact.name)}</p>
          <p className="text-xs text-muted-foreground">{sanitizeText(contact.phone ?? '—')}</p>
        </div>
      </div>
      <div className="text-xs space-y-1 text-muted-foreground">
        {[
          ['Email',     contact.email],
          ['Empresa',   contact.company],
          ['Canal',     contact.channel],
          ['Conversas', String(contact.conversation_count ?? 0)],
          ['Criado em', new Date(contact.created_at).toLocaleDateString('pt-BR')],
          ['LGPD',      contact.lgpd_consent_at ? '✅ Consentimento registrado' : '⚠️ Sem consentimento'],
        ].map(([k, v]) => (
          <div key={k}><span className="font-medium">{k}:</span> {sanitizeText(v ?? '—')}</div>
        ))}
        <div>
          <span className="font-medium">Tags:</span>{' '}
          {contact.tags.length > 0 ? contact.tags.map(sanitizeText).join(', ') : '—'}
        </div>
      </div>
    </div>
  );
}

function FieldSelector({ fieldKey, label, primaryValue, secondaryValue, value, onChange }: {
  fieldKey: string; label: string;
  primaryValue: string; secondaryValue: string;
  value: FieldChoice; onChange: (v: FieldChoice) => void;
}) {
  if (primaryValue === secondaryValue) return null; // no conflict
  return (
    <div className="space-y-2 py-2">
      <p className="text-sm font-medium flex items-center gap-1">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        {label}
      </p>
      <RadioGroup value={value} onValueChange={(v) => onChange(v as FieldChoice)} className="flex gap-4 flex-wrap">
        {([['primary', primaryValue], ['secondary', secondaryValue]] as const).map(([side, val]) => (
          <div key={side} className="flex items-center gap-2">
            <RadioGroupItem value={side} id={`${fieldKey}-${side}`} />
            <Label htmlFor={`${fieldKey}-${side}`} className="text-sm cursor-pointer">
              {val || <span className="italic text-muted-foreground">vazio</span>}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export const ContactMergeDialog: React.FC<ContactMergeDialogProps> = ({
  open, onOpenChange, primaryContact, secondaryContact, onMergeComplete,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resolution, setResolution] = useState<FieldResolution>({
    name: 'primary', phone: 'primary', email: 'primary',
    company: 'primary', notes: 'primary',
  });

  const pick = useCallback((field: keyof FieldResolution): string => {
    const src = resolution[field] === 'primary' ? primaryContact : secondaryContact;
    return sanitizeText((src as Record<string, unknown>)[field] as string ?? '');
  }, [resolution, primaryContact, secondaryContact]);

  const handleMerge = async () => {
    setLoading(true);
    try {
      const mergedTags = [...new Set([...primaryContact.tags, ...secondaryContact.tags])];

      // 1. Update primary with resolved fields
      const { error: e1 } = await supabase
        .from('contacts')
        .update({
          name:    pick('name'),
          phone:   pick('phone'),
          email:   pick('email'),
          company: pick('company'),
          notes:   pick('notes'),
          tags:    mergedTags,
          // Preserve oldest LGPD consent
          lgpd_consent_at: primaryContact.lgpd_consent_at ?? secondaryContact.lgpd_consent_at,
          merged_from_id: secondaryContact.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', primaryContact.id);
      if (e1) throw e1;

      // 2. Re-assign conversations
      const { error: e2 } = await supabase
        .from('conversations')
        .update({ contact_id: primaryContact.id })
        .eq('contact_id', secondaryContact.id);
      if (e2) throw e2;

      // 3. Re-assign messages
      const { error: e3 } = await supabase
        .from('messages')
        .update({ contact_id: primaryContact.id })
        .eq('contact_id', secondaryContact.id);
      if (e3) throw e3;

      // 4. Soft-delete secondary (never hard-delete — LGPD + audit trail)
      const { error: e4 } = await supabase
        .from('contacts')
        .update({
          deleted_at:     new Date().toISOString(),
          deleted_reason: `merged_into:${primaryContact.id}`,
        })
        .eq('id', secondaryContact.id);
      if (e4) throw e4;

      toast({
        title: '✅ Mesclagem concluída!',
        description: `"${sanitizeText(secondaryContact.name)}" foi unificado em "${sanitizeText(primaryContact.name)}". Histórico completo preservado.`,
      });
      onMergeComplete(primaryContact.id);
      onOpenChange(false);
    } catch (err) {
      console.error('[ContactMergeDialog]', err);
      toast({ title: 'Erro ao mesclar', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fields: Array<[keyof FieldResolution, string, keyof ContactForMerge]> = [
    ['name', 'Nome', 'name'], ['phone', 'Telefone', 'phone'],
    ['email', 'E-mail', 'email'], ['company', 'Empresa', 'company'],
    ['notes', 'Notas', 'notes'],
  ];

  const conflictCount = fields.filter(([, , k]) =>
    primaryContact[k] !== secondaryContact[k]).length;

  const mergedTags = [...new Set([...primaryContact.tags, ...secondaryContact.tags])];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-5 w-5 text-primary" />
            Mesclar Contatos Duplicados
          </DialogTitle>
          <DialogDescription>
            {conflictCount > 0
              ? `${conflictCount} campo(s) com valores diferentes. Escolha qual manter.`
              : 'Nenhum conflito de campos. Confirme a mesclagem.'}
            {' '}O histórico completo de ambos os contatos será preservado.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          <ContactCard contact={primaryContact} label="Principal" badge="Sobrevive" />
          <ContactCard contact={secondaryContact} label="Secundário" badge="Será excluído" />
        </div>

        {conflictCount > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Resolver conflitos de campos</p>
              {fields.map(([field, label, k]) => (
                <FieldSelector
                  key={field}
                  fieldKey={field}
                  label={label}
                  primaryValue={sanitizeText(primaryContact[k] as string ?? '')}
                  secondaryValue={sanitizeText(secondaryContact[k] as string ?? '')}
                  value={resolution[field]}
                  onChange={(v) => setResolution((r) => ({ ...r, [field]: v }))}
                />
              ))}
            </div>
          </>
        )}

        {mergedTags.length > 0 && (
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-2">Tags resultantes (união automática):</p>
            <div className="flex flex-wrap gap-1">
              {mergedTags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{sanitizeText(tag)}</Badge>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleMerge} disabled={loading} className="gap-2">
            {loading ? 'Mesclando...' : <><Check className="h-4 w-4" />Confirmar Mesclagem</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactMergeDialog;
