/**
 * ContactFormModal.tsx
 * Contact create/edit form using evolution_contacts schema.
 * Integrates: duplicate detection, optimistic locking, retry.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Phone, Mail, Building2, Tag, AlertTriangle, Save, Loader2, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sanitizeText } from '@/lib/sanitize';
import { normalizePhone, validatePhoneDetailed, formatPhoneForDisplay } from '@/lib/phoneUtils';
import { useRetryOperation } from '@/hooks/useRetryOperation';
import { useDuplicateDetector } from '@/components/contacts/useDuplicateDetector';
import { type Contact } from '@/hooks/useContacts';
import { dbFrom, dbRpc } from '@/integrations/datasource/db';
import { RPC } from '@/integrations/datasource/rpcCatalog';

interface ContactFormModalProps {
  instanceName: string;
  initialData?: Contact;
  isEdit?:      boolean;
  onSaved?:     () => void;
  onCancel?:    () => void;
}

const LEAD_STATUS_OPTIONS = [
  { value: 'novo',        label: '🆕 Novo' },
  { value: 'em_contato',  label: '💬 Em contato' },
  { value: 'qualificado', label: '✅ Qualificado' },
  { value: 'proposta',    label: '📋 Proposta enviada' },
  { value: 'negociacao',  label: '🤝 Em negociação' },
  { value: 'fechado',     label: '🏆 Fechado' },
  { value: 'perdido',     label: '❌ Perdido' },
];

const TagInput: React.FC<{ tags: string[]; onChange: (t: string[]) => void }> = ({ tags, onChange }) => {
  const [v, setV] = useState('');
  const add = () => { const t = sanitizeText(v.trim()); if (t && !tags.includes(t) && tags.length < 20) { onChange([...tags, t]); setV(''); } };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 min-h-8">{tags.map((t) => (
        <Badge key={t} variant="secondary" className="gap-1 text-xs">
          {t}<button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} aria-label={`Remover tag ${t}`}>×</button>
        </Badge>
      ))}</div>
      <div className="flex gap-2">
        <Input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="Adicionar tag (Enter)..." className="flex-1 h-8 text-sm" />
        <Button type="button" variant="outline" size="sm" onClick={add}>+</Button>
      </div>
    </div>
  );
};

export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  instanceName, initialData, isEdit = false, onSaved, onCancel,
}) => {
  const { toast } = useToast();
  const { withRetry, loading: retrying } = useRetryOperation(3, 500);

  const [fullName,     setFullName]     = useState(sanitizeText(initialData?.full_name ?? ''));
  const [phone,        setPhone]        = useState(initialData?.phone_number ?? '');
  const [email,        setEmail]        = useState(sanitizeText(initialData?.email ?? ''));
  const [company,      setCompany]      = useState(sanitizeText(initialData?.company ?? ''));
  const [tags,         setTags]         = useState<string[]>(initialData?.tags ?? []);
  const [notes,        setNotes]        = useState(sanitizeText(initialData?.notes ?? ''));
  const [leadStatus,   setLeadStatus]   = useState(initialData?.lead_status ?? 'novo');
  const [leadScore,    setLeadScore]    = useState(String(initialData?.lead_score ?? 0));
  const [saving,       setSaving]       = useState(false);
  const [phoneError,   setPhoneError]   = useState('');
  const [nameError,    setNameError]    = useState('');

  const { duplicates, hasDuplicates, checkDuplicates } = useDuplicateDetector({
    workspaceId: instanceName,
    excludeId: initialData?.id,
  });

  useEffect(() => {
    checkDuplicates(phone, email);
  }, [phone, email, checkDuplicates]);

  const validate = (): boolean => {
    let ok = true;
    if (!fullName.trim()) { setNameError('Nome é obrigatório.'); ok = false; } else setNameError('');
    if (phone) {
      const r = validatePhoneDetailed(phone);
      if (!r.valid) { setPhoneError(r.error ?? 'Telefone inválido.'); ok = false; } else setPhoneError('');
    } else setPhoneError('');
    return ok;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    try {
      await withRetry(async () => {
        const normalizedPhone = phone ? normalizePhone(phone) : null;
        const remoteJid = normalizedPhone ? `55${normalizedPhone}@c.us` : `unknown_${Date.now()}@c.us`;

        if (isEdit && initialData?.id) {
          const { data: result, error } = await dbRpc(RPC.updateContactVersioned, {
            p_contact_id:       initialData.id,
            p_expected_version: initialData.version ?? 1,
            p_updates: {
              full_name:    sanitizeText(fullName),
              phone_number: normalizedPhone,
              email:        email.toLowerCase().trim() || null,
              company:      sanitizeText(company) || null,
              tags,
              notes:        notes || null,
              lead_status:  leadStatus,
              lead_score:   parseInt(leadScore, 10) || 0,
            },
          });
          if (error) throw error;
          const r = (result ?? {}) as Record<string, unknown>;
          if (r?.error === 'CONFLICT') {
            toast({
              title: '⚠️ Conflito de edição',
              description: 'Este contato foi modificado por outro usuário. Recarregue e tente novamente.',
              variant: 'destructive',
            });
            return;
          }
        } else {
          const { error: res5961Err } = await dbFrom('contacts').insert({
            full_name:     sanitizeText(fullName),
            phone_number:  normalizedPhone,
            email:         email.toLowerCase().trim() || null,
            company:       sanitizeText(company) || null,
            tags,
            notes:         notes || null,
            lead_status:   leadStatus,
            lead_score:    parseInt(leadScore, 10) || 0,
            instance_name: instanceName,
            remote_jid:    remoteJid,
            created_at:    new Date().toISOString(),
            updated_at:    new Date().toISOString(),
          });
          if (error) {
            if (error.code === '23505') throw new Error('Já existe um contato com esse número ou e-mail.');
            throw error;
          }
        }

        toast({ title: isEdit ? '✅ Contato atualizado!' : '✅ Contato criado!', duration: 3_000 });
        onSaved?.();
      }, 'Salvar contato');
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: String(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const isLoading = saving || retrying;

  return (
    <div className="space-y-4" role="form" aria-label="Formulário de contato">
      {/* Duplicate warning */}
      {hasDuplicates && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-sm text-amber-800">
            Possível duplicata: <strong>{duplicates.map((d) => sanitizeText(d.name)).join(', ')}</strong>
          </AlertDescription>
        </Alert>
      )}

      {/* Name */}
      <div className="space-y-1">
        <Label htmlFor="cf-name" className="flex items-center gap-1 text-sm"><User className="h-3.5 w-3.5" />Nome *</Label>
        <Input id="cf-name" value={fullName} onChange={(e) => { setFullName(e.target.value); setNameError(''); }} placeholder="Nome completo" aria-required="true" aria-invalid={!!nameError} className={nameError ? 'border-destructive' : ''} />
        {nameError && <p role="alert" className="text-xs text-destructive">{nameError}</p>}
      </div>

      {/* Phone */}
      <div className="space-y-1">
        <Label htmlFor="cf-phone" className="flex items-center gap-1 text-sm"><Phone className="h-3.5 w-3.5" />Telefone</Label>
        <Input id="cf-phone" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); setPhoneError(''); }} placeholder="(11) 99999-9999" aria-invalid={!!phoneError} className={phoneError ? 'border-destructive' : ''} />
        {phone && !phoneError && <p className="text-xs text-muted-foreground">{formatPhoneForDisplay(normalizePhone(phone) ?? phone)}</p>}
        {phoneError && <p role="alert" className="text-xs text-destructive">{phoneError}</p>}
      </div>

      {/* Email */}
      <div className="space-y-1">
        <Label htmlFor="cf-email" className="flex items-center gap-1 text-sm"><Mail className="h-3.5 w-3.5" />E-mail</Label>
        <Input id="cf-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
      </div>

      {/* Company */}
      <div className="space-y-1">
        <Label htmlFor="cf-company" className="flex items-center gap-1 text-sm"><Building2 className="h-3.5 w-3.5" />Empresa</Label>
        <Input id="cf-company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Nome da empresa" />
      </div>

      {/* Lead Status + Score */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-sm">Status do Lead</Label>
          <Select value={leadStatus} onValueChange={setLeadStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEAD_STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cf-score" className="flex items-center gap-1 text-sm"><Star className="h-3.5 w-3.5" />Score (0-100)</Label>
          <Input id="cf-score" type="number" min="0" max="100" value={leadScore} onChange={(e) => setLeadScore(e.target.value)} />
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-1">
        <Label className="flex items-center gap-1 text-sm"><Tag className="h-3.5 w-3.5" />Tags</Label>
        <TagInput tags={tags} onChange={setTags} />
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label htmlFor="cf-notes" className="text-sm">Notas internas</Label>
        <Textarea id="cf-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Informações adicionais..." rows={3} className="resize-none" />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">Cancelar</Button>}
        <Button type="button" onClick={handleSave} disabled={isLoading} className="flex-1 gap-2" aria-busy={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isLoading ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar contato'}
        </Button>
      </div>
    </div>
  );
};

export default ContactFormModal;
