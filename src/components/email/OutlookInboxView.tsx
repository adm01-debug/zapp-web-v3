import { useState } from 'react';
import { Building2, RefreshCw, Mail, MailOpen, Paperclip, Search, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useOutlookEmail } from '@/hooks/useOutlookEmail';
import type { OutlookMessage } from '@/hooks/useOutlookEmail';

interface OutlookInboxViewProps {
  onSelectMessage?: (message: OutlookMessage) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return d.toLocaleDateString('pt-BR', { weekday: 'short' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getSenderName(msg: OutlookMessage): string {
  return msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || 'Desconhecido';
}

export function OutlookInboxView({ onSelectMessage }: OutlookInboxViewProps) {
  const {
    accounts,
    messages,
    activeAccountId,
    setActiveAccountId,
    isSyncing,
    unreadCount,
    syncInbox,
    markAsRead,
    startOAuth,
    nextLink,
    loadMore,
  } = useOutlookEmail();

  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = search.trim()
    ? messages.filter(m =>
        m.subject?.toLowerCase().includes(search.toLowerCase()) ||
        getSenderName(m).toLowerCase().includes(search.toLowerCase()) ||
        m.bodyPreview?.toLowerCase().includes(search.toLowerCase())
      )
    : messages;

  const handleSelect = (msg: OutlookMessage) => {
    setSelectedId(msg.id);
    if (!msg.isRead) markAsRead(msg.id, true);
    onSelectMessage?.(msg);
  };

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Building2 className="h-12 w-12 text-muted-foreground/30" />
        <div className="text-center">
          <p className="font-medium">Nenhuma conta Outlook conectada</p>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte sua conta Microsoft para ver emails aqui
          </p>
        </div>
        <Button onClick={startOAuth} className="gap-2">
          <Building2 className="h-4 w-4" />
          Conectar Outlook
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-500" />
          <h2 className="font-semibold text-sm">Outlook</h2>
          {unreadCount > 0 && (
            <Badge variant="default" className="text-xs h-5 px-1.5">{unreadCount}</Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => syncInbox()}
          disabled={isSyncing}
          className="gap-1.5 h-8"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Account Selector (se múltiplas contas) */}
      {accounts.length > 1 && (
        <div className="flex gap-2 px-4 py-2 border-b overflow-x-auto">
          {accounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => setActiveAccountId(acc.id)}
              className={`text-xs px-3 py-1 rounded-full border whitespace-nowrap transition-colors ${
                activeAccountId === acc.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-muted border-border'
              }`}
            >
              {acc.email}
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar emails..."
            className="pl-9 h-8 text-sm"
          />
        </div>
      </div>

      {/* Message List */}
      <ScrollArea className="flex-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
            {search ? 'Nenhum resultado para a busca' : 'Nenhum email na caixa de entrada'}
          </div>
        ) : (
          <div>
            {filtered.map((msg, idx) => (
              <div key={msg.id}>
                <button
                  onClick={() => handleSelect(msg)}
                  className={`w-full text-left p-4 hover:bg-muted/50 transition-colors ${
                    selectedId === msg.id ? 'bg-muted' : ''
                  } ${!msg.isRead ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {!msg.isRead
                        ? <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                        : <MailOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      }
                      <span className={`text-sm truncate ${!msg.isRead ? 'font-semibold' : 'font-normal text-muted-foreground'}`}>
                        {getSenderName(msg)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {msg.hasAttachments && <Paperclip className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(msg.receivedDateTime)}
                      </span>
                    </div>
                  </div>
                  <p className={`text-sm mt-0.5 ${!msg.isRead ? 'font-medium' : 'text-muted-foreground'}`}>
                    {msg.subject || '(sem assunto)'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {msg.bodyPreview}
                  </p>
                </button>
                {idx < filtered.length - 1 && <Separator />}
              </div>
            ))}

            {/* Load More */}
            {nextLink && (
              <div className="p-4 flex justify-center">
                <Button variant="outline" size="sm" onClick={loadMore} disabled={isSyncing}>
                  Carregar mais emails
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default OutlookInboxView;
