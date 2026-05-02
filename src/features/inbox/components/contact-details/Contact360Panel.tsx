/**
 * Contact360Panel.tsx — v3.0
 * Comprehensive 360° view for a contact in the Inbox sidebar.
 * Integrates: SafeHtml, AuditLogPanel, ContactConsentManager,
 * ContactPhoneManager (read-only), recent conversations.
 */
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  User, Phone, Mail, Building2, Tag, History, Shield,
  MessageCircle, ExternalLink, Clock,
} from 'lucide-react';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';
import SafeHtml from '@/components/contacts/SafeHtml';
import { AuditLogPanel } from '@/components/contacts/AuditLogPanel';
import { ContactConsentManager } from '@/components/contacts/ContactConsentManager';
import { openContactInChat } from '@/lib/openContactInChat';

// ── Types ──────────────────────────────────────────────────────────────────

interface PhoneEntry { number: string; type: string; is_whatsapp: boolean; is_primary: boolean; label?: string; }

interface Contact360Data {
  id:                      string;
  name:                    string;
  phone:                   string | null;
  phone_numbers?:          PhoneEntry[];
  email:                   string | null;
  company:                 string | null;
  notes:                   string | null;
  tags:                    string[];
  channel:                 string | null;
  avatar_url:              string | null;
  created_at:              string;
  last_seen_at:            string | null;
  conversation_count?:     number;
  lgpd_consent_at:         string | null;
  lgpd_consent_channel:    string | null;
  lgpd_opt_out_at:         string | null;
  lgpd_marketing_consent:  boolean;
  lgpd_data_sharing:       boolean;
  lgpd_profiling:          boolean;
}

interface Contact360PanelProps {
  contact:   Contact360Data;
  onEdit?:   () => void;
  readonly?: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: '💬', instagram: '📸', telegram: '✈️',
  messenger: '💙', email: '📧',
};

// ── Component ──────────────────────────────────────────────────────────────

export const Contact360Panel: React.FC<Contact360PanelProps> = ({
  contact, onEdit, readonly = false,
}) => {
  const phones = contact.phone_numbers?.length
    ? contact.phone_numbers
    : contact.phone ? [{ number: contact.phone, type: 'mobile', is_whatsapp: true, is_primary: true }] : [];

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="p-4 flex items-start gap-3 shrink-0">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          {contact.avatar_url ? (
            <img src={sanitizeText(contact.avatar_url)} alt={sanitizeText(contact.name)} className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <User className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-base truncate">{sanitizeText(contact.name)}</h3>
            {contact.channel && (
              <span title={contact.channel}>{CHANNEL_ICONS[contact.channel] ?? '📱'}</span>
            )}
          </div>
          {contact.company && (
            <p className="text-xs text-muted-foreground truncate">{sanitizeText(contact.company)}</p>
          )}
          <div className="flex flex-wrap gap-1 mt-1">
            {contact.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs h-4 px-1">{sanitizeText(tag)}</Badge>
            ))}
            {contact.tags.length > 4 && <Badge variant="outline" className="text-xs h-4">+{contact.tags.length - 4}</Badge>}
          </div>
        </div>
        {!readonly && onEdit && (
          <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0 text-xs h-7">
            Editar
          </Button>
        )}
      </div>

      <Separator />

      {/* ── Tabs ───────────────────────────────────────────────────────── */}
      <Tabs defaultValue="info" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-4 mt-2 h-7 shrink-0">
          <TabsTrigger value="info"    className="text-xs gap-1"><User className="h-3 w-3" />Info</TabsTrigger>
          <TabsTrigger value="consent" className="text-xs gap-1"><Shield className="h-3 w-3" />LGPD</TabsTrigger>
          <TabsTrigger value="history" className="text-xs gap-1"><History className="h-3 w-3" />Histórico</TabsTrigger>
        </TabsList>

        {/* ── Info ──────────────────────────────────────────────────────── */}
        <TabsContent value="info" className="flex-1 overflow-y-auto px-4 pb-4 mt-2 space-y-3">
          {/* Phones */}
          {phones.length > 0 && (
            <div className="space-y-1">
              {phones.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-mono">{formatPhoneForDisplay(p.number)}</span>
                  {p.is_primary && <Badge variant="outline" className="text-xs h-4 px-1">Principal</Badge>}
                  {p.is_whatsapp && <MessageCircle className="h-3 w-3 text-green-500" title="WhatsApp" />}
                  <button
                    type="button"
                    onClick={() => openContactInChat(contact.id, p.number)}
                    className="ml-auto text-muted-foreground hover:text-primary"
                    title="Abrir conversa"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Email */}
          {contact.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{sanitizeText(contact.email)}</span>
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Notas</p>
              <div className="text-sm rounded-md bg-muted/30 p-2 text-muted-foreground">
                <SafeHtml html={contact.notes} plainText={false} className="prose prose-sm prose-neutral max-w-none" />
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-muted-foreground space-y-1 pt-1">
            {contact.conversation_count !== undefined && (
              <div className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                {contact.conversation_count} conversa{contact.conversation_count !== 1 ? 's' : ''}
              </div>
            )}
            {contact.last_seen_at && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Último contato: {new Date(contact.last_seen_at).toLocaleDateString('pt-BR')}
              </div>
            )}
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              Criado: {new Date(contact.created_at).toLocaleDateString('pt-BR')}
            </div>
          </div>
        </TabsContent>

        {/* ── LGPD ──────────────────────────────────────────────────────── */}
        <TabsContent value="consent" className="flex-1 overflow-y-auto px-4 pb-4 mt-2">
          <ContactConsentManager
            contactId={contact.id}
            contactName={sanitizeText(contact.name)}
            consentData={{
              lgpd_consent_at:        contact.lgpd_consent_at,
              lgpd_consent_channel:   contact.lgpd_consent_channel,
              lgpd_opt_out_at:        contact.lgpd_opt_out_at,
              lgpd_marketing_consent: contact.lgpd_marketing_consent,
              lgpd_data_sharing:      contact.lgpd_data_sharing,
              lgpd_profiling:         contact.lgpd_profiling,
            }}
            readonly={readonly}
          />
        </TabsContent>

        {/* ── History ───────────────────────────────────────────────────── */}
        <TabsContent value="history" className="flex-1 overflow-y-auto px-4 pb-4 mt-2">
          <AuditLogPanel contactId={contact.id} maxEntries={20} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Contact360Panel;
