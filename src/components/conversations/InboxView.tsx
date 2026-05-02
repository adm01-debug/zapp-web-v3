/**
 * InboxView.tsx
 * Main inbox — 3-column: conversation list / messages / CRM sidebar.
 */
import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MessageCircle, Users, BarChart2, X, CheckCircle2, RotateCcw, UserCheck, MoreHorizontal } from 'lucide-react';
import { ConversationList } from '@/components/conversations/ConversationList';
import { ConversationsDashboard } from '@/components/conversations/ConversationsDashboard';
import { ContactSidebarPanel } from '@/components/contacts/ContactSidebarPanel';
import { useConversations, type Conversation } from '@/hooks/useConversations';
import { type Contact } from '@/hooks/useContacts';
import { sanitizeText } from '@/lib/sanitize';
import { formatPhoneForDisplay } from '@/lib/phoneUtils';

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-600 bg-red-50 border-red-200',
  high:   'text-orange-600 bg-orange-50 border-orange-200',
  normal: 'text-blue-600 bg-blue-50 border-blue-200',
  low:    'text-gray-600 bg-gray-50 border-gray-200',
};

export const InboxView: React.FC<{ instanceName?: string }> = ({ instanceName = 'wpp2' }) => {
  const { closeConversation, markAsRead } = useConversations();
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [showStats,    setShowStats]    = useState(false);
  const [showContact,  setShowContact]  = useState(true);
  const [closing,      setClosing]      = useState(false);

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
            <div className="flex items-center justify-between px-4 py-3 border-b gap-2 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">
                    {sanitizeText(selectedConv.contact_name ?? selectedConv.remote_jid?.replace(/@.*$/, '') ?? 'Conversa')}
                  </p>
                  <Badge className={`text-xs px-1.5 py-0 h-4 border ${PRIORITY_COLORS[selectedConv.priority] ?? ''}`}>
                    {selectedConv.priority}
                  </Badge>
                  {selectedConv.is_bot_active && <Badge className="text-xs bg-blue-100 text-blue-700 h-4 px-1.5">Bot</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatPhoneForDisplay(selectedConv.contact_phone ?? selectedConv.remote_jid?.replace(/@.*$/, '') ?? '')}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant={showContact ? 'default' : 'ghost'} size="icon" className="h-8 w-8"
                  onClick={() => setShowContact((v) => !v)} aria-pressed={showContact} title="CRM 360°">
                  <Users className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {selectedConv.status === 'open' && (
                      <DropdownMenuItem onClick={handleClose} disabled={closing} className="gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />{closing ? 'Encerrando...' : 'Encerrar'}
                      </DropdownMenuItem>
                    )}
                    {selectedConv.status === 'closed' && (
                      <DropdownMenuItem className="gap-2"><RotateCcw className="h-3.5 w-3.5" />Reabrir</DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2"><UserCheck className="h-3.5 w-3.5" />Atribuir agente</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-end">
              <div className="text-center text-muted-foreground py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Mensagens de {sanitizeText(selectedConv.remote_jid)}</p>
              </div>
            </div>
            <div className="border-t px-4 py-3 shrink-0">
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                <span className="text-sm text-muted-foreground flex-1">Responder...</span>
                <Button size="sm" className="h-7 gap-1"><MessageCircle className="h-3.5 w-3.5" />Enviar</Button>
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
        <div className="w-72 shrink-0 border-l flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">CRM 360°</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowContact(false)} aria-label="Fechar CRM">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
              <Users className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-xs text-center">Dados do contato carregam ao selecionar conversa com contact_id</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxView;
