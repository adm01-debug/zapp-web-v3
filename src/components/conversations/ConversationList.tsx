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
  AlertTriangle, Clock, CheckCircle2,
} from 'lucide-react';
import { useConversations, type Conversation, type ConversationFilters } from '@/hooks/useConversations';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';

// ── Types ──────────────────────────────────────────────────────────────────

interface ConversationListProps {
  instanceName?:       string;
  selectedId?:         string;
  onSelect:            (conv: Conversation) => void;
}

// ── Priority badge ─────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700 border-red-300',
  high:   'bg-orange-100 text-orange-700 border-orange-300',
  normal: 'bg-blue-100 text-blue-700 border-blue-300',
  low:    'bg-gray-100 text-gray-600',
};

// ── Conversation Item ──────────────────────────────────────────────────────

const ConvItem = memo(({
  conv, isSelected, onSelect,
}: {
  conv:       Conversation;
  isSelected: boolean;
  onSelect:   () => void;
}) => {
  const displayName = sanitizeText(conv.contact_name ?? conv.remote_jid ?? 'Desconhecido');
  const initials    = displayName.split(' ').filter(Boolean).slice(0,2).map((n) => n[0].toUpperCase()).join('');
  const phone       = formatPhoneForDisplay(conv.contact_phone ?? conv.remote_jid?.replace(/@.*$/, '') ?? '');
  const lastMsg     = conv.last_message_content ? sanitizeText(conv.last_message_content).slice(0, 60) : null;
  const timeStr     = conv.last_message_at
    ? new Date(conv.last_message_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full flex items-start gap-2.5 px-3 py-3 hover:bg-muted/40 transition-colors text-left border-b ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
      aria-selected={isSelected}
    >
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          {conv.contact_avatar && <img src={conv.contact_avatar} alt="" className="rounded-full" loading="lazy" />}
          <AvatarFallback className="text-xs font-medium">{initials || '?'}</AvatarFallback>
        </Avatar>
        {conv.is_bot_active && (
          <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center">
            <Bot className="h-2 w-2 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-sm font-medium truncate">{displayName}</span>
          <span className="text-xs text-muted-foreground shrink-0">{timeStr}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {conv.priority !== 'normal' && (
            <Badge className={`text-xs px-1 py-0 h-4 shrink-0 ${PRIORITY_COLORS[conv.priority] ?? ''}`}>
              {conv.priority === 'urgent' && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
              {conv.priority}
            </Badge>
          )}
          {conv.unread_count > 0 && (
            <Badge variant="destructive" className="text-xs min-w-[18px] h-4 px-1 shrink-0">
              {conv.unread_count > 99 ? '99+' : conv.unread_count}
            </Badge>
          )}
          <p className="text-xs text-muted-foreground truncate">
            {lastMsg ?? phone}
          </p>
        </div>
      </div>
    </button>
  );
});

ConvItem.displayName = 'ConvItem';

// ── Main Component ─────────────────────────────────────────────────────────

export const ConversationList: React.FC<ConversationListProps> = ({
  instanceName = 'wpp2', selectedId, onSelect,
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
