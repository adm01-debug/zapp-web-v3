/**
 * ContactSidebarPanel.tsx — v2.0
 * CRM 360° sidebar panel for the inbox using evolution_contacts schema.
 * Tabs: Activity / LGPD / Audit History
 */
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Mail, Clock, MessageCircle, Edit2, Shield, History, Activity, Star } from 'lucide-react';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';
import { type Contact } from '@/hooks/useContacts';
import { AuditLogPanel } from '@/components/contacts/AuditLogPanel';
import { LGPDConsentManager } from '@/components/contacts/LGPDConsentManager';
import SafeHtml from '@/components/contacts/SafeHtml';

const LEAD_STATUS_LABELS: Record<string, string> = {
  novo: '🆕 Novo', em_contato: '💬 Em contato', qualificado: '✅ Qualificado',
  proposta: '📋 Proposta', negociacao: '🤝 Negociação', fechado: '🏆 Fechado', perdido: '❌ Perdido',
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  novo: 'bg-gray-100 text-gray-700', em_contato: 'bg-blue-100 text-blue-700',
  qualificado: 'bg-green-100 text-green-700', proposta: 'bg-purple-100 text-purple-700',
  negociacao: 'bg-amber-100 text-amber-700', fechado: 'bg-emerald-100 text-emerald-700',
  perdido: 'bg-red-100 text-red-700',
};

interface Props {
  contact:     Contact;
  onEdit?:     () => void;
  onOpenChat?: () => void;
  onUpdated?:  (u: Partial<Contact>) => void;
  readonly?:   boolean;
}

export const ContactSidebarPanel: React.FC<Props> = ({
  contact, onEdit, onOpenChat, onUpdated, readonly = false,
}) => {
  const displayName = sanitizeText(contact.full_name ?? contact.push_name ?? contact.phone_number ?? 'Sem nome');
  const initials    = displayName.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');
  const hasConsent  = !!contact.lgpd_consent_at && !contact.lgpd_opt_out_at;
  const statusColor = LEAD_STATUS_COLORS[contact.lead_status] ?? '';
  const statusLabel = LEAD_STATUS_LABELS[contact.lead_status] ?? contact.lead_status;

  return (
    <div className="h-full flex flex-col overflow-hidden" role="complementary" aria-label={`Detalhes: ${displayName}`}>
      {/* Header */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-14 w-14 shrink-0">
            {contact.profile_picture_url && <AvatarImage src={sanitizeText(contact.profile_picture_url)} alt="" loading="lazy" />}
            <AvatarFallback className="text-base font-semibold">{initials || '?'}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base truncate">{displayName}</h2>
            {contact.company && <p className="text-sm text-muted-foreground truncate">{sanitizeText(contact.company)}</p>}
            <div className="flex flex-wrap gap-1 mt-1">
              <Badge className={`text-xs ${statusColor}`}>{statusLabel}</Badge>
              {contact.lead_score > 0 && (
                <Badge variant="outline" className="text-xs gap-0.5"><Star className="h-2.5 w-2.5" />{contact.lead_score}</Badge>
              )}
              <Badge className={`text-xs ${hasConsent ? 'bg-green-100 text-green-800 border-green-300' : 'bg-amber-50 text-amber-700 border-amber-400'}`}>
                <Shield className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
                {hasConsent ? 'LGPD ✓' : 'Sem consent.'}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-1 shrink-0">
            {onOpenChat && (
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={onOpenChat} aria-label="Abrir conversa">
                <MessageCircle className="h-4 w-4" />
              </Button>
            )}
            {onEdit && !readonly && (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onEdit} aria-label="Editar contato">
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Contact details */}
        <div className="space-y-1.5 text-sm">
          {contact.phone_number && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <a href={`tel:${contact.phone_number}`} className="hover:text-foreground transition-colors">
                {formatPhoneForDisplay(contact.phone_number)}
              </a>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <a href={`mailto:${sanitizeText(contact.email)}`} className="hover:text-foreground truncate text-sm">
                {sanitizeText(contact.email)}
              </a>
            </div>
          )}
          {contact.last_message_at && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs">Último msg: {new Date(contact.last_message_at).toLocaleDateString('pt-BR')}</span>
            </div>
          )}
          {contact.total_messages > 0 && (
            <div className="text-xs text-muted-foreground pl-5">
              {contact.total_messages.toLocaleString('pt-BR')} mensagens no total
            </div>
          )}
        </div>

        {/* Tags */}
        {contact.tags.length > 0 && (
          <div className="flex flex-wrap gap-1" role="list" aria-label="Tags">
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

      {/* Tabs */}
      <Tabs defaultValue="lgpd" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid grid-cols-2 mx-4 my-2 h-8">
          <TabsTrigger value="lgpd" className="text-xs h-7 gap-1"><Shield className="h-3 w-3" />LGPD</TabsTrigger>
          <TabsTrigger value="history" className="text-xs h-7 gap-1"><History className="h-3 w-3" />Histórico</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto">
          <TabsContent value="lgpd" className="p-4 mt-0">
            <LGPDConsentManager contact={contact} onUpdated={onUpdated} readonly={readonly} />
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
