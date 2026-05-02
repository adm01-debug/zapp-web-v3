/**
 * LGPDConsentManager.tsx — v2.0
 * LGPD consent management with grant/revoke RPCs.
 * Uses evolution_contacts + grant_lgpd_consent() + revoke_lgpd_consent() RPCs.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Shield, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { dbRpc } from '@/integrations/datasource/db';
import { RPC } from '@/integrations/datasource/rpcCatalog';
import { type Contact } from '@/hooks/useContacts';

interface Props { contact: Contact; onUpdated?: (u: Partial<Contact>) => void; readonly?: boolean; }

const CHANNELS = [
  { value: 'whatsapp', label: '💬 WhatsApp' }, { value: 'email', label: '📧 E-mail' },
  { value: 'form', label: '📝 Formulário' }, { value: 'phone', label: '📞 Telefone' },
  { value: 'manual', label: '✍️ Manual' }, { value: 'import', label: '📥 Importação' },
];

export const LGPDConsentManager: React.FC<Props> = ({ contact, onUpdated, readonly = false }) => {
  const { toast } = useToast();
  const [loading,   setLoading]   = useState<'grant' | 'revoke' | null>(null);
  const [channel,   setChannel]   = useState('manual');
  const [marketing, setMarketing] = useState(contact.lgpd_marketing_consent ?? false);
  const [dataShare, setDataShare] = useState(false);
  const [profiling, setProfiling] = useState(false);

  const hasConsent  = !!contact.lgpd_consent_at && !contact.lgpd_opt_out_at;
  const hasOptedOut = !!contact.lgpd_opt_out_at;

  const grant = async () => {
    setLoading('grant');
    try {
      const { data, error } = await dbRpc(RPC.grantLgpdConsent, {
        p_contact_id: contact.id, p_channel: channel,
        p_marketing_consent: marketing, p_data_sharing: dataShare, p_profiling: profiling,
      });
      if (error) throw error;
      const r = (typeof data === 'boolean' ? {} : ((data ?? {}) as Record<string, unknown>));
      if (r?.error) throw new Error(String(r.error));
      toast({ title: '✅ Consentimento registrado!', duration: 3000 });
      onUpdated?.({
        lgpd_consent_at: (r.granted_at as string | undefined) ?? new Date().toISOString(),
        lgpd_opt_out_at: null,
        lgpd_marketing_consent: marketing,
      });
    } catch (err) { toast({ title: 'Erro', description: String(err), variant: 'destructive' }); }
    finally { setLoading(null); }
  };

  const revoke = async () => {
    setLoading('revoke');
    try {
      const { data, error: res2783Err } = await dbRpc(RPC.revokeLgpdConsent, { p_contact_id: contact.id, p_reason: 'user_request' });
      if (error) throw error;
      const r = (typeof data === 'boolean' ? {} : ((data ?? {}) as Record<string, unknown>));
      if (r?.error) throw new Error(String(r.error));
      toast({ title: '📋 Opt-out registrado!', duration: 3000 });
      onUpdated?.({ lgpd_opt_out_at: r.opted_out_at as string, lgpd_marketing_consent: false });
    } catch (err) { toast({ title: 'Erro', description: String(err), variant: 'destructive' }); }
    finally { setLoading(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Consentimento LGPD</span></div>
        {hasConsent && <Badge className="bg-green-100 text-green-800 border-green-300 gap-1"><CheckCircle2 className="h-3 w-3" />Ativo</Badge>}
        {hasOptedOut && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Opt-out</Badge>}
        {!hasConsent && !hasOptedOut && <Badge variant="outline" className="text-amber-700 border-amber-400 gap-1"><AlertTriangle className="h-3 w-3" />Sem consentimento</Badge>}
      </div>

      {contact.lgpd_consent_at && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 space-y-1">
          <div className="flex justify-between"><span>Consentimento:</span><span>{new Date(contact.lgpd_consent_at).toLocaleDateString('pt-BR')}</span></div>
          {contact.lgpd_opt_out_at && <div className="flex justify-between text-destructive"><span>Opt-out:</span><span>{new Date(contact.lgpd_opt_out_at).toLocaleDateString('pt-BR')}</span></div>}
        </div>
      )}

      {!readonly && !hasConsent && (
        <div className="space-y-3 rounded-lg border p-3">
          <p className="text-xs font-medium">Registrar Consentimento</p>
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{CHANNELS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
          <div className="space-y-2">
            {[
              { id: 'mkt', label: '📣 Marketing', state: marketing, set: setMarketing },
              { id: 'share', label: '🤝 Compartilhamento', state: dataShare, set: setDataShare },
              { id: 'prof', label: '🎯 Perfilagem', state: profiling, set: setProfiling },
            ].map(({ id, label, state, set }) => (
              <div key={id} className="flex items-center justify-between">
                <Label htmlFor={id} className="text-xs cursor-pointer">{label}</Label>
                <Switch id={id} checked={state} onCheckedChange={set} />
              </div>
            ))}
          </div>
          <Button onClick={grant} disabled={loading === 'grant'} className="w-full gap-2" size="sm">
            {loading === 'grant' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {loading === 'grant' ? 'Registrando...' : 'Registrar consentimento'}
          </Button>
        </div>
      )}

      {!readonly && hasConsent && !hasOptedOut && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertDescription className="text-xs text-amber-800 space-y-2">
            <p>Opt-out revoga todos os consentimentos e impede comunicações de marketing.</p>
            <Button variant="destructive" size="sm" className="gap-1" onClick={revoke} disabled={loading === 'revoke'}>
              {loading === 'revoke' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
              {loading === 'revoke' ? 'Processando...' : 'Registrar opt-out (LGPD)'}
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default LGPDConsentManager;
