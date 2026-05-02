/**
 * Contact360Panel.tsx
 * Complete 360° contact panel integrating ALL v3.0 components.
 * Used in the Inbox sidebar and the Contact detail sheet.
 *
 * Tabs:
 *   1. Info — basic data + phone manager + consent
 *   2. Activity — real-time timeline
 *   3. History — audit log (LGPD)
 *   4. Purchases — purchase history (if Bitrix sync)
 */
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  User, Phone, Mail, Building2, Tag, MessageCircle,
  History, ShoppingBag, Clock,
} from 'lucide-react';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';
import { SafeHtml } from './SafeHtml';
import { ContactConsentManager, ConsentData } from './ContactConsentManager';
import { AuditLogPanel } from './AuditLogPanel';
import { ActivityTimeline } from './ActivityTimeline';
import { ContactPhoneManager, PhoneEntry } from './ContactPhoneManager';

// ── Types ──────────────────────────────────────────────────────────────────

export interface Contact360Data {
  id:             string;
  name:           string;
  phone:          string | null;
  phone_numbers?: PhoneEntry[];
  email:          string | null;
  company:        string | null;
  tags:           string[];
  channel:        string | null;
  avatar_url:     string | null;
  notes:          string | null;
  created_at:     string;
  last_seen_at:   string | null;
  conversation_count?: number;
  consent?:       Partial<ConsentData>;
}

interface Contact360PanelProps {
  contact:      Contact360Data;
  onEdit?:      () => void;
  workspaceId:  string;
  readonly?:    boolean;
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: '💬 WhatsApp', instagram: '📸 Instagram',
  telegram: '✈️ Telegram', messenger: '💙 Messenger', email: '📧 E-mail',
};

// ── Component ──────────────────────────────────────────────────────────────

export const Contact360Panel: React.FC<Contact360PanelProps> = ({
  contact, onEdit, workspaceId, readonly = false,
}) => {
  const [activeTab, setActiveTab] = useState('info');

  const initials = contact.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <div className="flex flex-col h-full">
      {/* Contact header */}
      <div className="flex items-start gap-3 p-4 border-b">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarImage src={contact.avatar_url ?? undefined} alt={sanitizeText(contact.name)} />
          <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
            {initials || <User className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base leading-tight truncate">
            {sanitizeText(contact.name)}
          </h3>

          {contact.phone && (
            <p className="text-sm text-muted-foreground font-mono">
              {formatPhoneForDisplay(contact.phone)}
            </p>
          )}

          <div className="flex flex-wrap gap-1 mt-1.5">
            {contact.channel && (
              <Badge variant="secondary" className="text-xs">
                {CHANNEL_LABELS[contact.channel] ?? sanitizeText(contact.channel)}
              </Badge>
            )}
            {contact.conversation_count !== undefined && (
              <Badge variant="outline" className="text-xs gap-1">
                <MessageCircle className="h-3 w-3" />
                {contact.conversation_count}
              </Badge>
            )}
            {contact.last_seen_at && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                {new Date(contact.last_seen_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              </Badge>
            )}
          </div>
        </div>

        {onEdit && !readonly && (
          <Button variant="outline" size="sm" onClick={onEdit} className="shrink-0">
            Editar
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-2 mt-2 shrink-0 justify-start text-xs">
          <TabsTrigger value="info"     className="gap-1 text-xs"><User className="h-3 w-3" />Info</TabsTrigger>
          <TabsTrigger value="activity" className="gap-1 text-xs"><Clock className="h-3 w-3" />Atividade</TabsTrigger>
          <TabsTrigger value="history"  className="gap-1 text-xs"><History className="h-3 w-3" />Histórico</TabsTrigger>
        </TabsList>

        {/* ── Info tab ───────────────────────────────────────────────── */}
        <TabsContent value="info" className="flex-1 overflow-y-auto p-3 mt-0 space-y-4">
          {/* Basic fields */}
          <div className="space-y-2">
            {[
              { icon: <Mail className="h-3.5 w-3.5" />,     value: contact.email,   label: 'E-mail' },
              { icon: <Building2 className="h-3.5 w-3.5" />,value: contact.company, label: 'Empresa' },
            ].filter((f) => f.value).map((f) => (
              <div key={f.label} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">{f.icon}</span>
                <span className="truncate">{sanitizeText(f.value!)}</span>
              </div>
            ))}
          </div>

          {/* Tags */}
          {contact.tags.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Tags
              </p>
              <div className="flex flex-wrap gap-1">
                {contact.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">{sanitizeText(tag)}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* All phone numbers */}
          {contact.phone_numbers && contact.phone_numbers.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Phone className="h-3 w-3" /> Telefones
              </p>
              <ContactPhoneManager
                phones={contact.phone_numbers}
                onChange={() => {}}
                readonly={readonly}
              />
            </div>
          )}

          {/* Notes */}
          {contact.notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notas</p>
              <SafeHtml html={contact.notes} className="text-sm bg-muted/30 rounded p-2" />
            </div>
          )}

          {/* LGPD consent */}
          <ContactConsentManager
            contactId={contact.id}
            contactName={contact.name}
            consentData={{
              lgpd_consent_at:        contact.consent?.lgpd_consent_at ?? null,
              lgpd_consent_channel:   contact.consent?.lgpd_consent_channel ?? null,
              lgpd_opt_out_at:        contact.consent?.lgpd_opt_out_at ?? null,
              lgpd_marketing_consent: contact.consent?.lgpd_marketing_consent ?? false,
              lgpd_data_sharing:      contact.consent?.lgpd_data_sharing ?? false,
              lgpd_profiling:         contact.consent?.lgpd_profiling ?? false,
            }}
            readonly={readonly}
          />
        </TabsContent>

        {/* ── Activity tab ───────────────────────────────────────────── */}
        <TabsContent value="activity" className="flex-1 overflow-y-auto p-3 mt-0">
          <ActivityTimeline contactId={contact.id} maxItems={30} />
        </TabsContent>

        {/* ── History tab (LGPD) ─────────────────────────────────────── */}
        <TabsContent value="history" className="flex-1 overflow-y-auto p-3 mt-0">
          <AuditLogPanel contactId={contact.id} maxEntries={25} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Contact360Panel;
