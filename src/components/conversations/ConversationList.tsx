/**
 * ConversationList.tsx
 * Paginated conversation list for the Inbox.
 * Uses useConversations hook with real schema.
 * Features: status/priority/agent filters, search, infinite scroll.
 */
import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Search, X, RefreshCw, MessageCircle, Bot,
  AlertTriangle, Clock, CheckCircle2, Check, CheckCheck
} from 'lucide-react';
import { useConversations, type Conversation, type ConversationFilters } from '@/hooks/useConversations';
import { DEFAULT_WHATSAPP_INSTANCE } from '@/lib/constants/whatsappInstances';
import { useContactTyping } from '@/hooks/useContactTyping';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ── Types ──────────────────────────────────────────────────────────────────

interface ConversationListProps {
  instanceName?:       string;
  selectedId?:         string;
  onSelect:            (conv: Conversation) => void;
}

// ── Priority badge ─────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-destructive bg-destructive/10 border-destructive/20',
  high:   'text-warning bg-warning/10 border-warning/20',
  normal: 'text-primary bg-primary/10 border-primary/20',
  low:    'text-muted-foreground bg-muted border-border',
};

// ── Conversation Item ──────────────────────────────────────────────────────

const ConvItem = memo(({
  conv, isSelected, onSelect,
}: {
  conv:       Conversation;
  isSelected: boolean;
  onSelect:   () => void;
}) => {
  const isTyping    = useContactTyping(conv.remote_jid);
  const displayName = sanitizeText(conv.contact_name ?? conv.remote_jid?.split('@')[0] ?? 'Desconhecido');
  const initials    = displayName.split(' ').filter(Boolean).slice(0,2).map((n) => n[0].toUpperCase()).join('');
  const phone       = formatPhoneForDisplay(conv.contact_phone ?? conv.remote_jid?.replace(/@.*$/, '') ?? '');
  const lastMsg     = conv.last_message_content ? sanitizeText(conv.last_message_content).slice(0, 60) : null;
  const timeStr     = conv.last_message_at
    ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ptBR })
    : '';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-start gap-3 px-3.5 py-2.5 hover:bg-muted/40 transition-colors text-left border-b ${isSelected ? 'bg-primary/5 border-l-[3px] border-l-primary' : ''}`}
      aria-selected={isSelected}
    >
      <div className="relative shrink-0">
        <Avatar className="h-12 w-12 border border-border">
          {conv.contact_avatar && <img src={conv.contact_avatar} alt="" className="rounded-full h-full w-full object-cover" loading="lazy" />}
          <AvatarFallback className="text-sm font-medium bg-muted text-muted-foreground">{initials || '?'}</AvatarFallback>
        </Avatar>
        {conv.is_bot_active && (
          <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center shadow-sm">
            <Bot className="h-2.5 w-2.5 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 py-0.5">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <span className="text-sm font-semibold truncate leading-tight">{displayName}</span>
          <span className={`text-[11px] shrink-0 ${conv.unread_count > 0 ? 'text-primary font-medium' : 'text-muted-foreground'}`}>{timeStr}</span>
        </div>
        <div className="flex items-center gap-1.5 h-5">
          {isTyping ? (
            <p className="text-xs text-primary font-medium animate-pulse flex items-center gap-1">
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce"></span>
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1 h-1 bg-primary rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </span>
              Digitando...
            </p>
          ) : (
            <p className="text-xs text-muted-foreground truncate flex-1 leading-normal">
              {lastMsg ?? phone}
            </p>
          )}
          {conv.unread_count > 0 && (
            <Badge className="text-[10px] min-w-[18px] h-4.5 px-1 bg-primary hover:bg-primary text-white border-none rounded-full flex items-center justify-center font-bold">
              {conv.unread_count > 99 ? '99+' : conv.unread_count}
            </Badge>
          )}
          {conv.priority !== 'normal' && (
            <Badge className={`text-[10px] px-1.5 py-0 h-4 shrink-0 rounded-sm border-none uppercase tracking-wider font-bold ${PRIORITY_COLORS[conv.priority] ?? ''}`}>
              {conv.priority}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
});

ConvItem.displayName = 'ConvItem';

// ── Main Component ─────────────────────────────────────────────────────────

export const ConversationList: React.FC<ConversationListProps> = ({
  instanceName = DEFAULT_WHATSAPP_INSTANCE, selectedId, onSelect,
}) => {
  const {
    conversations, loading, loadingMore, hasMore, total, filters,
    loadConversations, loadMore, updateFilters,
  } = useConversations();

  const [search, setSearch]           = useState('');
  const searchDebounce                = useRef<ReturnType<typeof setTimeout>>();
  const loadMoreRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => { loadConversations({ instance_name: instanceName }); }, [instanceName, loadConversations]);

  // Infinite scroll
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loadingMore) loadMore(); },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) obs.observe(loadMoreRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loadMore]);

  const handleSearch = (value: string) => {
    setSearch(value);
    clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => updateFilters({ search: value }), 400);
  };

  const STATUS_OPTIONS = [
    { value: 'open',   label: '🟢 Abertas' },
    { value: 'closed', label: '⚪ Encerradas' },
    { value: 'all',    label: '🔵 Todas' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b space-y-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9 pr-8 h-9 text-sm"
          />
          {search && (
            <button onClick={() => { setSearch(''); updateFilters({ search: '' }); }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Select
            value={filters.status}
            onValueChange={(v) => updateFilters({ status: v as ConversationFilters['status'] })}
          >
            <SelectTrigger className="flex-1 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
            {total.toLocaleString('pt-BR')}
          </span>

          <Button
            variant="ghost" size="icon" className="h-7 w-7 shrink-0"
            onClick={() => loadConversations()}
            disabled={loading}
            aria-label="Recarregar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && conversations.length === 0 ? (
          <div className="space-y-0 animate-pulse">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-2.5 px-3 py-3 border-b">
                <div className="h-9 w-9 rounded-full bg-muted shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-muted rounded w-32" />
                  <div className="h-3 bg-muted rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageCircle className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">Nenhuma conversa</p>
            <p className="text-xs">{filters.status === 'open' ? 'Nenhuma conversa aberta' : 'Tente outro filtro'}</p>
          </div>
        ) : (
          <>
            {conversations.map((conv) => (
              <ConvItem
                key={conv.id}
                conv={conv}
                isSelected={conv.id === selectedId}
                onSelect={() => onSelect(conv)}
              />
            ))}
            <div ref={loadMoreRef} className="h-2" />
            {loadingMore && (
              <div className="flex justify-center py-2 text-xs text-muted-foreground gap-1">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Carregando...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ConversationList;
