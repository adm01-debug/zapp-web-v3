/**
 * ContactRow.tsx
 * Individual contact row for the contacts list.
 * Uses evolution_contacts schema (full_name, phone_number, push_name).
 */
import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageCircle, MoreHorizontal, Phone, Mail, Edit2, Trash2 } from 'lucide-react';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';
import { type Contact } from '@/hooks/useContacts';

const LEAD_STATUS_COLORS: Record<string, string> = {
  novo:        'bg-gray-100 text-gray-700',
  em_contato:  'bg-blue-100 text-blue-700',
  qualificado: 'bg-green-100 text-green-700',
  proposta:    'bg-purple-100 text-purple-700',
  negociacao:  'bg-amber-100 text-amber-700',
  fechado:     'bg-emerald-100 text-emerald-700',
  perdido:     'bg-red-100 text-red-700',
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  novo: '🆕 Novo', em_contato: '💬 Contato', qualificado: '✅ Qualif.',
  proposta: '📋 Proposta', negociacao: '🤝 Negoc.', fechado: '🏆 Fechado', perdido: '❌ Perdido',
};

interface ContactRowProps {
  contact:    Contact;
  isSelected: boolean;
  onSelect:   () => void;
  onOpenChat: () => void;
  onEdit:     () => void;
  onDelete:   () => void;
}

export const ContactRow: React.FC<ContactRowProps> = memo(({
  contact, isSelected, onSelect, onOpenChat, onEdit, onDelete,
}) => {
  const displayName = sanitizeText(contact.full_name ?? contact.push_name ?? contact.phone_number ?? 'Sem nome');
  const initials    = displayName.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');
  const phone       = contact.phone_number ? formatPhoneForDisplay(contact.phone_number) : null;
  const statusColor = LEAD_STATUS_COLORS[contact.lead_status] ?? LEAD_STATUS_COLORS.novo;
  const statusLabel = LEAD_STATUS_LABELS[contact.lead_status] ?? contact.lead_status;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2.5 border-b transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
      role="row"
      aria-selected={isSelected}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
        aria-label={`Selecionar ${displayName}`}
        className="shrink-0"
      />

      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        {contact.profile_picture_url && (
          <AvatarImage src={sanitizeText(contact.profile_picture_url)} alt="" loading="lazy" />
        )}
        <AvatarFallback className="text-xs font-medium">{initials || '?'}</AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-sm truncate">{displayName}</span>
          <Badge variant="outline" className={`text-xs px-1.5 py-0 h-4 shrink-0 ${statusColor}`}>
            {statusLabel}
          </Badge>
          {contact.lead_score > 0 && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 h-4 shrink-0">
              ★ {contact.lead_score}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {phone && (
            <span className="flex items-center gap-1 shrink-0">
              <Phone className="h-3 w-3" aria-hidden="true" />
              {phone}
            </span>
          )}
          {contact.email && (
            <span className="flex items-center gap-1 truncate">
              <Mail className="h-3 w-3 shrink-0" aria-hidden="true" />
              {sanitizeText(contact.email)}
            </span>
          )}
        </div>
      </div>

      {/* Tags */}
      {contact.tags.length > 0 && (
        <div className="hidden md:flex gap-1 shrink-0 max-w-[120px]">
          {contact.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs truncate max-w-[55px]">
              {sanitizeText(tag)}
            </Badge>
          ))}
          {contact.tags.length > 2 && (
            <Badge variant="secondary" className="text-xs shrink-0">+{contact.tags.length - 2}</Badge>
          )}
        </div>
      )}

      {/* Last seen */}
      <span className="text-xs text-muted-foreground shrink-0 hidden lg:block w-16 text-right">
        {contact.last_message_at
          ? new Date(contact.last_message_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : '—'}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={onOpenChat}
          aria-label={`Conversar com ${displayName}`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Mais ações">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit} className="gap-2">
              <Edit2 className="h-3.5 w-3.5" />Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenChat} className="gap-2">
              <MessageCircle className="h-3.5 w-3.5" />Abrir conversa
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="gap-2 text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

ContactRow.displayName = 'ContactRow';
export default ContactRow;
