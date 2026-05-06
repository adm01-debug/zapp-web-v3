/**
 * InboxView.tsx
 * Main inbox — 3-column: conversation list / messages / CRM sidebar.
 */
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageCircle, Users, BarChart2, X, CheckCircle2, RotateCcw, UserCheck, MoreHorizontal, Search } from 'lucide-react';
import { ConversationList } from '@/components/conversations/ConversationList';
import { MessageList } from '@/components/conversations/MessageList';
import { ConversationsDashboard } from '@/components/conversations/ConversationsDashboard';
import { ContactSidebarPanel } from '@/components/contacts/ContactSidebarPanel';
import { useMessageQueue } from '@/hooks/messaging/useMessageQueue';
import { useConversations, type Conversation } from '@/hooks/useConversations';
import { type Contact } from '@/hooks/useContacts';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-destructive bg-destructive/10 border-destructive/20',
  high:   'text-warning bg-warning/10 border-warning/20',
  normal: 'text-primary bg-primary/10 border-primary/20',
  low:    'text-muted-foreground bg-muted border-border',
};

export const InboxView: React.FC<{ instanceName?: string }> = ({ instanceName = 'wpp2' }) => {
  const { closeConversation, markAsRead } = useConversations();
  const { enqueueMessage, pendingMessages } = useMessageQueue(instanceName);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [showStats,    setShowStats]    = useState(false);
  const [showContact,  setShowContact]  = useState(true);
  const [closing,      setClosing]      = useState(false);
  const [message,      setMessage]      = useState('');
  const [showSearch,   setShowSearch]   = useState(false);
  const [searchTerm,   setSearchTerm]   = useState('');
  const [replyTo,      setReplyTo]      = useState<any | null>(null);

  const handleSend = () => {
    if (!selectedConv || !message.trim()) return;
    
    // In a real app, we'd pass the quoted message ID to the queue
    enqueueMessage(selectedConv.remote_jid, message.trim());
    setMessage('');
    setReplyTo(null);
  };

  const handleSelectConv = useCallback(async (conv: Conversation) => {
    setSelectedConv(conv);
    if (conv.unread_count > 0) await markAsRead(conv.id);
  }, [markAsRead]);

  const handleClose = async () => {
    if (!selectedConv) return;
    setClosing(true);
    try { await closeConversation(selectedConv.id); setSelectedConv(null); }
    finally { setClosing(false); }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Column 1: Conversation list */}
      <div className="w-80 shrink-0 border-r flex flex-col h-full">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Inbox</span>
          </div>
          <Button variant={showStats ? 'default' : 'ghost'} size="icon" className="h-7 w-7"
            onClick={() => setShowStats((v) => !v)} aria-pressed={showStats}>
            <BarChart2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        {showStats && (
          <div className="px-3 py-2 border-b bg-muted/20">
            <ConversationsDashboard instanceName={instanceName} compact />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <ConversationList instanceName={instanceName} selectedId={selectedConv?.id} onSelect={handleSelectConv} />
        </div>
      </div>

      {/* Column 2: Message panel */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {selectedConv ? (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b gap-2 shrink-0 bg-background/95 backdrop-blur-sm z-10">
              <div className="flex items-center gap-3 min-w-0">
                <Avatar className="h-10 w-10 border border-border shrink-0">
                  {selectedConv.contact_avatar && <AvatarImage src={selectedConv.contact_avatar} alt="" className="object-cover" />}
                  <AvatarFallback className="text-sm font-semibold bg-muted text-muted-foreground">
                    {sanitizeText(selectedConv.contact_name ?? selectedConv.remote_jid ?? '?').split(' ').filter(Boolean).slice(0,2).map(n => n[0].toUpperCase()).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm truncate leading-tight">
                      {sanitizeText(selectedConv.contact_name ?? selectedConv.remote_jid?.split('@')[0] ?? 'Conversa')}
                    </p>
                    {selectedConv.is_bot_active && (
                      <Badge className="text-[10px] bg-blue-100 text-blue-700 h-4 px-1.5 border-none font-bold uppercase tracking-wider">Bot</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {formatPhoneForDisplay(selectedConv.contact_phone ?? selectedConv.remote_jid?.split('@')[0] ?? '')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                 <Button variant={showSearch ? 'default' : 'ghost'} size="icon" className="h-9 w-9 rounded-full"
                  onClick={() => setShowSearch(!showSearch)} title="Pesquisar mensagens">
                  <Search className="h-4.5 w-4.5" />
                </Button>
                <Button variant={showContact ? 'default' : 'ghost'} size="icon" className="h-9 w-9 rounded-full"
                  onClick={() => setShowContact((v) => !v)} aria-pressed={showContact} title="CRM 360°">
                  <Users className="h-4.5 w-4.5" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full"><MoreHorizontal className="h-4.5 w-4.5" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {selectedConv.status === 'open' && (
                      <DropdownMenuItem onClick={handleClose} disabled={closing} className="gap-2 py-2">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{closing ? 'Encerrando...' : 'Encerrar conversa'}</span>
                      </DropdownMenuItem>
                    )}
                    {selectedConv.status === 'closed' && (
                      <DropdownMenuItem className="gap-2 py-2">
                        <RotateCcw className="h-4 w-4" />
                        <span className="font-medium text-sm">Reabrir conversa</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 py-2">
                      <UserCheck className="h-4 w-4" />
                      <span className="font-medium text-sm">Atribuir a um agente</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {showSearch && (
              <div className="px-4 py-2 border-b bg-background/95 backdrop-blur-sm flex items-center gap-2 animate-in slide-in-from-top duration-200">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Pesquisar nesta conversa..." 
                    className="w-full bg-muted/50 border-none rounded-md pl-9 pr-3 py-1.5 text-sm focus:ring-1 focus:ring-primary outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowSearch(false); setSearchTerm(''); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex-1 overflow-hidden relative flex flex-col">
              <MessageList 
                remoteJid={selectedConv.remote_jid} 
                searchTerm={searchTerm} 
                onReply={(msg) => setReplyTo(msg)}
              />
            </div>
            {replyTo && (
              <div className="px-4 py-2 border-l-4 border-l-primary bg-muted/30 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-200">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-primary uppercase">Respondendo a {replyTo.from_me ? 'Você' : 'Contato'}</p>
                  <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="bg-background dark:bg-muted/30 px-4 py-2.5 shrink-0 z-10 border-t">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-lg bg-background px-4 py-2 shadow-sm border border-transparent focus-within:border-primary/20 transition-all">
                  <input 
                    type="text" 
                    placeholder="Digite uma mensagem..." 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="bg-transparent border-none outline-none text-sm w-full placeholder:text-muted-foreground/60"
                  />
                </div>
                <Button 
                  size="icon" 
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 shadow-sm shrink-0"
                >
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
            <p className="font-medium">Selecione uma conversa</p>
          </div>
        )}
      </div>

      {/* Column 3: CRM Sidebar */}
      {showContact && selectedConv && (
        <div className="w-80 shrink-0 border-l flex flex-col h-full overflow-hidden bg-background">
          <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0 h-[61px]">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setShowContact(false)} aria-label="Fechar CRM">
              <X className="h-4.5 w-4.5" />
            </Button>
            <span className="text-sm font-semibold">Dados do contato</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {selectedConv.contact_id ? (
              <ContactSidebarPanel 
                contact={{ id: selectedConv.contact_id, remote_jid: selectedConv.remote_jid, full_name: selectedConv.contact_name, phone_number: selectedConv.contact_phone, profile_picture_url: selectedConv.contact_avatar } as any} 
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground p-6 text-center">
                <Users className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Sem perfil vinculado</p>
                <p className="text-xs mt-1">Este contato ainda não possui dados detalhados no CRM.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxView;
