/**
 * ContactsTableVirtual.tsx
 * High-performance virtualized contacts table using @tanstack/react-virtual.
 * Renders 100k+ contacts at 60fps — only DOM nodes for visible rows.
 *
 * Drops in as replacement for ContactsTable.tsx when contact count > 500.
 * Below 500 contacts, ContactsTable.tsx is sufficient.
 */
import React, { useRef, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, MoreHorizontal, Phone, Mail } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';
import { type ContactListItem } from './useContactsPagination';

// ── Types ──────────────────────────────────────────────────────────────────

interface ContactsTableVirtualProps {
  contacts:           ContactListItem[];
  selectedIds:        Set<string>;
  onSelectToggle:     (id: string) => void;
  onSelectAll:        () => void;
  onClearSelection:   () => void;
  onOpenChat:         (contact: ContactListItem) => void;
  onEdit:             (contact: ContactListItem) => void;
  onDelete:           (contact: ContactListItem) => void;
  loadMoreRef?:       React.RefObject<HTMLDivElement>;
  loadingMore?:       boolean;
}

const ROW_HEIGHT = 64; // px — keep consistent with CSS

// ── Row Component (memoized for perf) ──────────────────────────────────────

const ContactRow = memo(({
  contact, isSelected, onSelect, onOpenChat, onEdit, onDelete,
}: {
  contact:     ContactListItem;
  isSelected:  boolean;
  onSelect:    () => void;
  onOpenChat:  () => void;
  onEdit:      () => void;
  onDelete:    () => void;
}) => {
  const initials = sanitizeText(contact.name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');

  const channelColor: Record<string, string> = {
    whatsapp:  'bg-green-100 text-green-800',
    instagram: 'bg-pink-100 text-pink-800',
    telegram:  'bg-blue-100 text-blue-800',
    email:     'bg-gray-100 text-gray-800',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 border-b transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
      style={{ height: ROW_HEIGHT }}
      role="row"
      aria-selected={isSelected}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onSelect}
        aria-label={`Selecionar ${sanitizeText(contact.name)}`}
        className="shrink-0"
      />

      {/* Avatar */}
      <Avatar className="h-9 w-9 shrink-0">
        {contact.avatar_url && <AvatarImage src={sanitizeText(contact.avatar_url)} alt="" />}
        <AvatarFallback className="text-xs font-medium">{initials || '?'}</AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm truncate">{sanitizeText(contact.name)}</p>
          {contact.channel && (
            <Badge variant="outline" className={`text-xs shrink-0 ${channelColor[contact.channel] ?? 'bg-gray-100'}`}>
              {sanitizeText(contact.channel)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {contact.phone && (
            <span className="flex items-center gap-1 truncate">
              <Phone className="h-3 w-3 shrink-0" aria-hidden="true" />
              {formatPhoneForDisplay(contact.phone)}
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
      <div className="hidden lg:flex items-center gap-1 shrink-0 max-w-[140px]">
        {contact.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs truncate max-w-[60px]">
            {sanitizeText(tag)}
          </Badge>
        ))}
        {contact.tags.length > 2 && (
          <Badge variant="secondary" className="text-xs">+{contact.tags.length - 2}</Badge>
        )}
      </div>

      {/* Last seen */}
      <span className="text-xs text-muted-foreground shrink-0 hidden md:block w-20 text-right">
        {contact.last_seen_at
          ? new Date(contact.last_seen_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
          : '—'}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onOpenChat}
          aria-label={`Abrir conversa com ${sanitizeText(contact.name)}`}
        >
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Mais ações">
              <MoreHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Editar contato</DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenChat}>Abrir conversa</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              Excluir contato
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

ContactRow.displayName = 'ContactRow';

// ── Table Header ───────────────────────────────────────────────────────────

const TableHeader = memo(({
  allSelected, someSelected, total, selectedCount, onSelectAll, onClearSelection,
}: {
  allSelected: boolean; someSelected: boolean; total: number; selectedCount: number;
  onSelectAll: () => void; onClearSelection: () => void;
}) => (
  <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 border-b text-xs font-medium text-muted-foreground" role="rowgroup">
    <Checkbox
      checked={allSelected}
      ref={(el) => { if (el) (el as HTMLElement & { indeterminate?: boolean }).indeterminate = someSelected && !allSelected; }}
      onCheckedChange={allSelected || someSelected ? onClearSelection : onSelectAll}
      aria-label={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
      className="shrink-0"
    />
    <div className="flex-1">
      {selectedCount > 0
        ? `${selectedCount} de ${total.toLocaleString('pt-BR')} selecionado${selectedCount !== 1 ? 's' : ''}`
        : `${total.toLocaleString('pt-BR')} contato${total !== 1 ? 's' : ''}`}
    </div>
    <span className="hidden lg:block w-[140px]">Tags</span>
    <span className="hidden md:block w-20 text-right">Último contato</span>
    <div className="w-[72px]" />
  </div>
));

TableHeader.displayName = 'TableHeader';

// ── Main Component ─────────────────────────────────────────────────────────

export const ContactsTableVirtual: React.FC<ContactsTableVirtualProps> = ({
  contacts, selectedIds, onSelectToggle, onSelectAll, onClearSelection,
  onOpenChat, onEdit, onDelete, loadMoreRef, loadingMore,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count:           contacts.length,
    getScrollElement: () => parentRef.current,
    estimateSize:    () => ROW_HEIGHT,
    overscan:        10, // pre-render 10 rows above/below viewport
  });

  const items = virtualizer.getVirtualItems();

  const toggleAll = useCallback(() => {
    if (selectedIds.size === contacts.length) onClearSelection();
    else onSelectAll();
  }, [selectedIds.size, contacts.length, onClearSelection, onSelectAll]);

  return (
    <div className="flex flex-col h-full" role="table" aria-label="Lista de contatos">
      {/* Header */}
      <TableHeader
        allSelected={selectedIds.size === contacts.length && contacts.length > 0}
        someSelected={selectedIds.size > 0 && selectedIds.size < contacts.length}
        total={contacts.length}
        selectedCount={selectedIds.size}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
      />

      {/* Virtualized body */}
      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto"
        role="rowgroup"
        aria-label="Contatos"
      >
        {contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">Nenhum contato encontrado.</p>
          </div>
        ) : (
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {items.map((virtualItem) => {
              const contact = contacts[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  style={{
                    position:  'absolute',
                    top:       virtualItem.start,
                    left:      0,
                    right:     0,
                    height:    ROW_HEIGHT,
                  }}
                >
                  <ContactRow
                    contact={contact}
                    isSelected={selectedIds.has(contact.id)}
                    onSelect={() => onSelectToggle(contact.id)}
                    onOpenChat={() => onOpenChat(contact)}
                    onEdit={() => onEdit(contact)}
                    onDelete={() => onDelete(contact)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Infinite scroll trigger */}
        {loadMoreRef && (
          <div ref={loadMoreRef} className="h-4" aria-hidden="true" />
        )}
        {loadingMore && (
          <div className="flex justify-center py-3 text-xs text-muted-foreground" aria-live="polite">
            Carregando mais contatos...
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsTableVirtual;
