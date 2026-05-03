import React, { useRef, useCallback, memo, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, MoreVertical, Phone, Mail, Briefcase, Tag, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getAvatarColor, getInitials } from '@/lib/avatar-colors';
import { CONTACT_TYPE_CONFIG } from './contactTypeConfig';
import { CompanyLogo } from './CompanyLogo';
import { HighlightText } from './HighlightText';
import { type Contact } from './types';

// ── Types ──────────────────────────────────────────────────────────────────

interface ContactsTableVirtualProps {
  contacts:           Contact[];
  selectedIds:        string[];
  onSelectIds:        (ids: string[]) => void;
  onOpenChat:         (id: string) => void;
  onEdit:             (contact: Contact) => void;
  onDelete:           (contact: Contact) => void;
  getCRMData?:        (phone: string) => any;
  searchQuery?:       string;
  loadMoreRef?:       React.RefObject<HTMLDivElement>;
  loadingMore?:       boolean;
}

const ROW_HEIGHT = 64; // px

// ── Row Component (memoized for perf) ──────────────────────────────────────

const ContactRow = memo(({
  contact, isSelected, onToggleSelect, onOpenChat, onEdit, onDelete, getCRMData, searchQuery
}: {
  contact:     Contact;
  isSelected:  boolean;
  onToggleSelect: (id: string, selected: boolean) => void;
  onOpenChat:  (id: string) => void;
  onEdit:      (contact: Contact) => void;
  onDelete:    (contact: Contact) => void;
  getCRMData?: (phone: string) => any;
  searchQuery?: string;
}) => {
  const avatarColors = getAvatarColor(contact.name);
  const typeConfig = CONTACT_TYPE_CONFIG[contact.contact_type || 'cliente'] || CONTACT_TYPE_CONFIG.cliente;
  const crmData = getCRMData?.(contact.phone);

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 border-b transition-colors cursor-pointer group",
        isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/30'
      )}
      style={{ height: ROW_HEIGHT }}
      role="row"
      aria-selected={isSelected}
      onClick={() => onOpenChat(contact.id)}
    >
      {/* Checkbox */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onToggleSelect(contact.id, !!checked)}
          aria-label={`Selecionar ${contact.name}`}
        />
      </div>

      {/* Avatar & Info */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative shrink-0">
          <Avatar className="w-9 h-9">
            <AvatarImage src={contact.avatar_url || undefined} />
            <AvatarFallback className={cn('font-semibold text-xs', avatarColors.bg, avatarColors.text)}>
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
            typeConfig.dotBg
          )} />
        </div>
        <div className="min-w-0">
          <HighlightText 
            text={`${contact.name} ${contact.surname || ''}`.trim()} 
            highlight={searchQuery} 
            className="font-medium text-sm block truncate" 
          />
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className={cn("text-[10px] h-4 px-1 font-medium gap-1", typeConfig.badgeClass)}>
              {typeConfig.iconNode}
              {typeConfig.label}
            </Badge>
            {contact.nickname && <span className="text-[10px] text-muted-foreground italic truncate">({contact.nickname})</span>}
          </div>
        </div>
      </div>

      {/* Professional */}
      <div className="hidden lg:flex flex-col min-w-[120px] max-w-[180px]">
        {contact.company ? (
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <CompanyLogo
              logoUrl={crmData?.logo_url}
              companyName={crmData?.company_name}
              fallbackCompanyName={contact.company}
              size="xs"
            />
            <HighlightText text={crmData?.company_name || contact.company} highlight={searchQuery} className="truncate" />
          </div>
        ) : <span className="text-muted-foreground/30 text-xs">—</span>}
        {contact.job_title && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
            <Briefcase className="w-2.5 h-2.5" />
            <HighlightText text={contact.job_title} highlight={searchQuery} className="truncate" />
          </div>
        )}
      </div>

      {/* Contact Details */}
      <div className="hidden md:flex flex-col min-w-[140px] max-w-[200px]">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          <Phone className="w-3 h-3" />
          <HighlightText text={contact.phone} highlight={searchQuery} />
        </div>
        {contact.email && (
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate mt-0.5">
            <Mail className="w-3 h-3" />
            <HighlightText text={contact.email} highlight={searchQuery} />
          </div>
        )}
      </div>

      {/* Tags */}
      <div className="hidden xl:flex items-center gap-1 shrink-0 max-w-[120px]">
        {contact.tags?.slice(0, 2).map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1 truncate">
            {tag}
          </Badge>
        ))}
        {(contact.tags?.length || 0) > 2 && (
          <Badge variant="secondary" className="text-[10px] h-4 px-1">+{(contact.tags?.length || 0) - 2}</Badge>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 hover:bg-primary/10 hover:text-primary" 
          onClick={() => onOpenChat(contact.id)}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(contact)}><Edit className="w-4 h-4 mr-2" />Editar</DropdownMenuItem>
            <DropdownMenuItem><Tag className="w-4 h-4 mr-2" />Gerenciar etiquetas</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(contact)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
});

ContactRow.displayName = 'ContactRow';

// ── Table Header ───────────────────────────────────────────────────────────

const TableHeader = memo(({
  contacts, selectedIds, onSelectIds
}: {
  contacts: Contact[];
  selectedIds: string[];
  onSelectIds: (ids: string[]) => void;
}) => {
  const allSelected = selectedIds.length === contacts.length && contacts.length > 0;
  const someSelected = selectedIds.length > 0 && selectedIds.length < contacts.length;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b text-[11px] font-semibold uppercase tracking-wider text-muted-foreground" role="rowgroup">
      <div className="shrink-0 w-4">
        <Checkbox
          checked={allSelected}
          onCheckedChange={(checked) => onSelectIds(checked ? contacts.map(c => c.id) : [])}
          aria-label={allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
        />
      </div>
      <div className="flex-1">Contato</div>
      <div className="hidden lg:block min-w-[120px] max-w-[180px]">Profissional</div>
      <div className="hidden md:block min-w-[140px] max-w-[200px]">Contato</div>
      <div className="hidden xl:block w-[120px]">Etiquetas</div>
      <div className="w-[72px] text-right">Ações</div>
    </div>
  );
});

TableHeader.displayName = 'TableHeader';

// ── Main Component ─────────────────────────────────────────────────────────

export const ContactsTableVirtual: React.FC<ContactsTableVirtualProps> = ({
  contacts, selectedIds, onSelectIds, onOpenChat, onEdit, onDelete, getCRMData, searchQuery, loadMoreRef, loadingMore,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count:           contacts.length,
    getScrollElement: () => parentRef.current,
    estimateSize:    () => ROW_HEIGHT,
    overscan:        15,
  });

  const items = virtualizer.getVirtualItems();

  const handleToggleSelect = useCallback((id: string, selected: boolean) => {
    if (selected) {
      onSelectIds([...selectedIds, id]);
    } else {
      onSelectIds(selectedIds.filter(i => i !== id));
    }
  }, [selectedIds, onSelectIds]);

  return (
    <div className="flex flex-col h-[600px] border border-border/30 rounded-xl overflow-hidden bg-card" role="table" aria-label="Lista de contatos">
      <TableHeader
        contacts={contacts}
        selectedIds={selectedIds}
        onSelectIds={onSelectIds}
      />

      <div
        ref={parentRef}
        className="flex-1 overflow-y-auto scrollbar-thin"
        role="rowgroup"
      >
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {items.map((virtualItem) => {
            const contact = contacts[virtualItem.index];
            if (!contact) return null;
            return (
              <div
                key={virtualItem.key}
                style={{
                  position:  'absolute',
                  top:       0,
                  left:      0,
                  width:     '100%',
                  height:    ROW_HEIGHT,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <ContactRow
                  contact={contact}
                  isSelected={selectedIds.includes(contact.id)}
                  onToggleSelect={handleToggleSelect}
                  onOpenChat={onOpenChat}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  getCRMData={getCRMData}
                  searchQuery={searchQuery}
                />
              </div>
            );
          })}
        </div>

        {loadMoreRef && (
          <div ref={loadMoreRef} className="h-10 flex items-center justify-center p-4">
            {loadingMore && <div className="text-xs text-muted-foreground animate-pulse">Carregando mais...</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactsTableVirtual;