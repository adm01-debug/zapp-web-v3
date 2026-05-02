/**
 * Contact360Panel.tsx — v2.0
 * Complete 360° contact panel integrating ALL v3+ components.
 * Used in the Inbox sidebar and the Contact detail sheet.
 *
 * Tabs:
 *   1. Info — inline-edit fields + phone manager + SLA + consent + quick notes
 *   2. Activity — real-time timeline + conversation history
 *   3. Histórico — audit log (LGPD)
 *
 * Integrations:
 *   - Supabase Realtime via useContactRealtime (Gap #1)
 *   - Inline editing via ContactInlineEdit (Gap #6)
 *   - SLA indicator via ContactSLAIndicator (Gap #9)
 *   - Quick notes via ContactQuickNotePanel (Gap #15)
 *   - Duplicate detection via ContactDuplicateIndicator (Gap #14)
 *   - Conversation history via ContactConversationHistory (Gap #7)
 *   - Orphan state via ContactOrphanState (Gap #13)
 *   - Avatar auto-fetch via useContactAvatarFetch (Gap #3)
 *   - Normalized phone display via normalizePhoneBR (Gap #2)
 */
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  User, Phone, Mail, Building2, Tag, MessageCircle,
  History, Clock, RefreshCw,
} from 'lucide-react';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneBR } from '@/lib/normalizePhoneBR';
import { SafeHtml } from './SafeHtml';
import { ContactConsentManager, ConsentData } from './ContactConsentManager';
import { AuditLogPanel } from './AuditLogPanel';
import { ActivityTimeline } from './ActivityTimeline';
import { ContactPhoneManager, PhoneEntry } from './ContactPhoneManager';
import { ContactInlineEdit } from './ContactInlineEdit';
import { ContactSLAIndicator, SLAStatus } from './ContactSLAIndicator';
import { ContactQuickNotePanel } from './ContactQuickNotePanel';
import { ContactDuplicateIndicator } from './ContactDuplicateIndicator';
import { ContactConversationHistory } from './ContactConversationHistory';
import { ContactOrphanState } from './ContactOrphanState';
import { useContactAvatarFetch } from '@/hooks/useContactAvatarFetch';

// ── Types ──────────────────────────────────────────────────────────────

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
  sla_status?:    SLAStatus;
  sla_remaining_minutes?: number;
  sla_target_minutes?: number;
  custom_fields?: Record<string, unknown>;
}

interface Contact360PanelProps {
  contact:       Contact360Data | null;
  onEdit?:       () => void;
  workspaceId:   string;
  readonly?:     boolean;
  isLoading?:    boolean;
  remoteJid?:    string;
  onCreateContact?: () => void;
  onLinkContact?:   () => void;
  onOpenConversation?: (conversationId: string) => void;
  onMergeContact?:  (duplicateId: string) => void;
  onContactUpdated?: (field: string, value: string) => void;
}

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: '💬 WhatsApp', instagram: '📸 Instagram',
  telegram: '✈️ Telegram', messenger: '💙 Messenger', email: '📧 E-mail',
  webchat: '🌐 Webchat',
};

// ── Component ──────────────────────────────────────────────────────────

export const Contact360Panel: React.FC<Contact360PanelProps> = ({
  contact, onEdit, workspaceId, readonly = false,
  isLoading = false, remoteJid, onCreateContact, onLinkContact,
  onOpenConversation, onMergeContact, onContactUpdated,
}) => {
  const [activeTab, setActiveTab] = useState('info');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Auto-fetch WhatsApp avatar
  const { fetchAvatar } = useContactAvatarFetch({
    contactId: contact?.id ?? '',
    phone: contact?.phone ?? null,
    currentAvatarUrl: contact?.avatar_url ?? null,
    workspaceId,
  });

  useEffect(() => {
    if (contact && !contact.avatar_url && contact.phone) {
      fetchAvatar().then((url) => { if (url) setAvatarUrl(url); });
    } else {
      setAvatarUrl(contact?.avatar_url ?? null);
    }
  }, [contact?.id, contact?.avatar_url, contact?.phone, fetchAvatar]);

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 p-4" aria-busy="true">
        <div className="flex items-start gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  // ── Orphan state (no contact) ──
  if (!contact) {
    return (
      <ContactOrphanState
        remoteJid={remoteJid}
        channel={undefined}
        onCreateContact={onCreateContact}
        onLinkContact={onLinkContact}
      />
    );
  }

  const initials = contact.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="flex flex-col h-full" role="region" aria-label={`Painel 360° de ${sanitizeText(contact.name)}`}>
      {/* ── Contact header ── */}
      <div className="flex items-start gap-3 p-4 border-b">
        <Avatar className="h-14 w-14 shrink-0">
          <AvatarImage src={avatarUrl ?? undefined} alt={sanitizeText(contact.name)} />
          <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
            {initials || <User className="h-6 w-6" />}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Inline-editable name */}
          <ContactInlineEdit
            contactId={contact.id}
            field="name"
            value={contact.name}
            className="font-semibold text-base leading-tight truncate block"
            readonly={readonly}
            onSaved={(v) => onContactUpdated?.('name', v)}
            validate={(v) => v.length < 2 ? 'Mínimo 2 caracteres' : null}
          />

          {contact.phone && (
            <p className="text-sm text-muted-foreground font-mono mt-0.5">
              {formatPhoneBR(contact.phone)}
            </p>
          )}

          <div className="flex flex-wrap gap-1 mt-1.5">
            {/* SLA Indicator */}
            {contact.sla_status && contact.sla_status !== 'none' && (
              <ContactSLAIndicator
                status={contact.sla_status}
                remainingMinutes={contact.sla_remaining_minutes}
                targetMinutes={contact.sla_target_minutes}
              />
            )}

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

      {/* ── Duplicate detection alert ── */}
      <div className="px-4 pt-2">
        <ContactDuplicateIndicator
          contactId={contact.id}
          contactName={contact.name}
          contactPhone={contact.phone}
          contactEmail={contact.email}
          workspaceId={workspaceId}
          onMerge={onMergeContact}
        />
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="mx-2 mt-2 shrink-0 justify-start text-xs">
          <TabsTrigger value="info" className="gap-1 text-xs">
            <User className="h-3 w-3" />Info
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-1 text-xs">
            <Clock className="h-3 w-3" />Atividade
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1 text-xs">
            <History className="h-3 w-3" />Histórico
          </TabsTrigger>
        </TabsList>

        {/* ── Info tab ── */}
        <TabsContent value="info" className="flex-1 overflow-y-auto p-3 mt-0 space-y-4">
          {/* Inline-editable fields */}
          <div className="space-y-2">
            {contact.email !== null && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground shrink-0"><Mail className="h-3.5 w-3.5" /></span>
                <ContactInlineEdit
                  contactId={contact.id}
                  field="email"
                  value={contact.email ?? ''}
                  className="truncate"
                  readonly={readonly}
                  onSaved={(v) => onContactUpdated?.('email', v)}
                  placeholder="Adicionar e-mail"
                />
              </div>
            )}
            {contact.company !== null && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground shrink-0"><Building2 className="h-3.5 w-3.5" /></span>
                <ContactInlineEdit
                  contactId={contact.id}
                  field="company"
                  value={contact.company ?? ''}
                  className="truncate"
                  readonly={readonly}
                  onSaved={(v) => onContactUpdated?.('company', v)}
                  placeholder="Adicionar empresa"
                />
              </div>
            )}
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

          {/* Phone numbers */}
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

          {/* Custom fields */}
          {contact.custom_fields && Object.keys(contact.custom_fields).length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-1 font-medium">Campos Personalizados</p>
              <div className="space-y-1">
                {Object.entries(contact.custom_fields).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                    <span className="font-medium truncate ml-2">{String(val ?? '—')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes (legacy) */}
          {contact.notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Notas</p>
              <SafeHtml html={contact.notes} className="text-sm bg-muted/30 rounded p-2" />
            </div>
          )}

          {/* Quick Notes */}
          <ContactQuickNotePanel
            contactId={contact.id}
            workspaceId={workspaceId}
            readonly={readonly}
          />

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

        {/* ── Activity tab ── */}
        <TabsContent value="activity" className="flex-1 overflow-y-auto p-3 mt-0 space-y-4">
          <ActivityTimeline contactId={contact.id} maxItems={30} />

          {/* Conversation History */}
          <ContactConversationHistory
            contactId={contact.id}
            workspaceId={workspaceId}
            onOpenConversation={onOpenConversation}
          />
        </TabsContent>

        {/* ── History tab (LGPD) ── */}
        <TabsContent value="history" className="flex-1 overflow-y-auto p-3 mt-0">
          <AuditLogPanel contactId={contact.id} maxEntries={25} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Contact360Panel;
