import { useState } from 'react';
import { Mail, Building2, Layers } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { GmailInboxView } from '@/components/gmail/GmailInboxView';
import { OutlookInboxView } from '@/components/email/OutlookInboxView';
import { useEmailAccounts } from '@/hooks/useEmailAccounts';

/**
 * EmailChatInboxUnified — Inbox unificado que integra Gmail + Outlook + IMAP
 *
 * Detecta automaticamente os provedores de email configurados
 * e mostra uma aba para cada um. Sem configuração manual.
 */
export function EmailChatInboxUnified() {
  const {
    hasGmail,
    hasOutlook,
    totalUnread,
    totalSlaBreached,
    isLoading,
  } = useEmailAccounts();

  const [defaultTab] = useState(() => {
    if (hasGmail) return 'gmail';
    if (hasOutlook) return 'outlook';
    return 'gmail';
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header unificado */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
        <Layers className="h-5 w-5 text-primary" />
        <h1 className="font-semibold">Email Chat</h1>
        {totalUnread > 0 && (
          <Badge variant="default" className="text-xs h-5 px-1.5">{totalUnread} não lidos</Badge>
        )}
        {totalSlaBreached > 0 && (
          <Badge variant="destructive" className="text-xs h-5 px-1.5">{totalSlaBreached} SLA violado</Badge>
        )}
      </div>

      {/* Tabs por provedor */}
      <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="px-4 py-2 h-auto justify-start border-b rounded-none bg-transparent gap-1">
          <TabsTrigger value="gmail" className="gap-1.5 text-xs data-[state=active]:bg-muted">
            <Mail className="h-3.5 w-3.5" />
            Gmail
          </TabsTrigger>
          <TabsTrigger value="outlook" className="gap-1.5 text-xs data-[state=active]:bg-muted">
            <Building2 className="h-3.5 w-3.5" />
            Outlook
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gmail" className="flex-1 mt-0 overflow-hidden">
          <GmailInboxView />
        </TabsContent>

        <TabsContent value="outlook" className="flex-1 mt-0 overflow-hidden">
          <OutlookInboxView />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EmailChatInboxUnified;
