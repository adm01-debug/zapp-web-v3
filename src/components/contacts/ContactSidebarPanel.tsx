/**
 * ContactSidebarPanel.tsx — CRM 360° Sidebar v3.0
 * New contact details panel for inbox sidebar.
 * Full integration: activity, LGPD consent, audit history.
 */
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, Clock, MessageCircle, Edit2, Shield, History, Activity } from 'lucide-react';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';
import { ContactActivityFeed } from './ContactActivityFeed';
import { AuditLogPanel } from './AuditLogPanel';
import { ContactConsentManager, type ConsentData } from './ContactConsentManager';
import SafeHtml from './SafeHtml';

export interface ContactSidebarData {
  id: string; name: string; phone: string | null; email: string | null;
  company: string | null; tags: string[]; notes: string | null;
  channel: string | null; avatar_url: string | null; workspace_id: string;
  created_at: string; last_seen_at: string | null;
  lgpd_consent_at?: string | null; lgpd_consent_channel?: string | null;
  lgpd_opt_out_at?: string | null; lgpd_marketing_consent?: boolean;
  lgpd_data_sharing?: boolean; lgpd_profiling?: boolean;
}

interface Props { contact: ContactSidebarData; onEdit?: () => void; onOpenChat?: () => void; readonly?: boolean; }

export const ContactSidebarPanel: React.FC<Props> = ({ contact, onEdit, onOpenChat, readonly = false }) => {
  const initials = sanitizeText(contact.name).split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');
  const lgpdOk = !!contact.lgpd_consent_at && !contact.lgpd_opt_out_at;
  const consent: ConsentData = {
    lgpd_consent_at: contact.lgpd_consent_at ?? null,
    lgpd_consent_channel: contact.lgpd_consent_channel ?? null,
    lgpd_opt_out_at: contact.lgpd_opt_out_at ?? null,
    lgpd_marketing_consent: contact.lgpd_marketing_consent ?? false,
    lgpd_data_sharing: contact.lgpd_data_sharing ?? false,
    lgpd_profiling: contact.lgpd_profiling ?? false,
  };

  return (
    <div className="h-full flex flex-col overflow-hidden" role="complementary" aria-label={`Detalhes: ${sanitizeText(contact.name)}`}>
      {/* ── Header ── */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 shrink-0">
            {contact.avatar_url && <AvatarImage src={sanitizeText(contact.avatar_url)} alt="" />}
            <AvatarFallback className="text-base font-semibold">{initials || '?'}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base truncate">{sanitizeText(contact.name)}</h2>
            {contact.company && <p className="text-sm text-muted-foreground truncate">{sanitizeText(contact.company)}</p>}
            <div className="flex flex-wrap gap-1 mt-1">
              {contact.channel && <Badge variant="outline" className="text-xs">{sanitizeText(contact.channel)}</Badge>}
              <Badge className={`text-xs ${lgpdOk ? 'bg-green-100 text-green-800 border-green-300' : 'bg-amber-50 text-amber-700 border-amber-400'}`}>
                <Shield className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                {lgpdOk ? 'LGPD ✓' : 'Sem consentimento'}
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            {onOpenChat && <Button size="icon" variant="outline" className="h-8 w-8" onClick={onOpenChat} aria-label="Abrir conversa"><MessageCircle className="h-4 w-4" aria-hidden="true" /></Button>}
            {onEdit && <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} aria-label="Editar"><Edit2 className="h-4 w-4" aria-hidden="true" /></Button>}
          </div>
        </div>

        {/* Info lines */}
        <div className="space-y-1.5 text-sm">
          {contact.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <a href={`tel:${contact.phone}`} className="hover:text-foreground transition-colors">{formatPhoneForDisplay(contact.phone)}</a>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <a href={`mailto:${sanitizeText(contact.email)}`} className="hover:text-foreground truncate text-sm">{sanitizeText(contact.email)}</a>
            </div>
          )}
          {contact.last_seen_at && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="text-xs">Último: {new Date(contact.last_seen_at).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1" role="list" aria-label="Tags do contato">
            {contact.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs" role="listitem">{sanitizeText(t)}</Badge>)}
          </div>
        )}

        {/* Notes */}
        {contact.notes && (
          <div className="rounded-md bg-muted/30 p-2.5">
            <SafeHtml html={contact.notes} className="text-xs text-muted-foreground" />
          </div>
        )}
      </div>

      <Separator />

      {/* ── Tabs ── */}
      <Tabs defaultValue="activity" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-3 mx-4 my-2 h-8">
          <TabsTrigger value="activity" className="text-xs h-7 gap-1"><Activity className="h-3 w-3" aria-hidden="true" />Atividade</TabsTrigger>
          <TabsTrigger value="lgpd" className="text-xs h-7 gap-1"><Shield className="h-3 w-3" aria-hidden="true" />LGPD</TabsTrigger>
          <TabsTrigger value="history" className="text-xs h-7 gap-1"><History className="h-3 w-3" aria-hidden="true" />Histórico</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="activity" className="p-4 mt-0">
            <ContactActivityFeed contactId={contact.id} maxItems={20} />
          </TabsContent>
          <TabsContent value="lgpd" className="p-4 mt-0">
            <ContactConsentManager contactId={contact.id} contactName={sanitizeText(contact.name)} consentData={consent} readonly={readonly} />
          </TabsContent>
          <TabsContent value="history" className="p-4 mt-0">
            <AuditLogPanel contactId={contact.id} maxEntries={20} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default ContactSidebarPanel;
