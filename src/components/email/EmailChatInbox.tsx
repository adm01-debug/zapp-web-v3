import { useState } from 'react';
import { Mail, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useGmail } from '@/hooks/useGmail';
import { EmailThreadList } from './EmailThreadList';
import { EmailChatThread } from './EmailChatThread';
import { EmailSearchBar } from './EmailSearchBar';
import { GmailAccountSelector } from '../gmail/GmailAccountSelector';
import { type GmailThread } from '@/hooks/gmail/gmailTypes';
import { type EmailSearchResult } from '@/hooks/useEmailSearch';

interface EmailChatInboxProps {
  className?: string;
}

export function EmailChatInbox({ className }: EmailChatInboxProps) {
  const {
    threads,
    selectedThread,
    messages,
    isLoadingThreads,
    isLoadingMessages,
    isSyncing,
    hasMore,
    error,
    activeAccountId,
    accounts,
    tokenStatus,
    selectThread,
    setActiveAccountId,
    syncNow,
    loadMore,
    startOAuth,
    disconnect,
  } = useGmail();

  const totalUnread = threads.filter(t => t.unread_count > 0).length;

  // Quando busca seleciona uma thread
  const handleSearchSelect = (result: EmailSearchResult) => {
    const thread = threads.find(t => t.id === result.id || t.thread_id === result.thread_id);
    if (thread) selectThread(thread);
    // Se não estiver no cache local, poderia fazer fetch pelo threadId
  };

  // Sem contas conectadas
  if (accounts.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full gap-6 p-8', className)}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <h3 className="font-semibold text-lg">Email Chat</h3>
            <p className="text-muted-foreground text-sm mt-1 max-w-64">
              Conecte sua conta Gmail para gerenciar emails diretamente no ZAPP WEB.
            </p>
          </div>
        </div>

        <Button onClick={startOAuth} className="gap-2 h-10">
          <Mail className="h-4 w-4" />
          Conectar conta Gmail
        </Button>

        <p className="text-xs text-muted-foreground text-center max-w-56">
          Seus emails são sincronizados com segurança via OAuth2. Nunca armazenamos sua senha.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full overflow-hidden', className)}>
      {/* Sidebar: Thread list */}
      <div className="w-80 shrink-0 flex flex-col border-r h-full">
        {/* Account selector + search */}
        <div className="p-3 space-y-2 border-b">
          <GmailAccountSelector
            accounts={accounts}
            activeAccountId={activeAccountId}
            tokenStatus={tokenStatus}
            isSyncing={isSyncing}
            onSelectAccount={setActiveAccountId}
            onAddAccount={startOAuth}
            onDisconnect={disconnect}
            onSync={syncNow}
            totalUnread={totalUnread}
          />
          <EmailSearchBar
            accountId={activeAccountId}
            onSelectThread={handleSearchSelect}
          />
        </div>

        {/* Error */}
        {error && (
          <Alert variant="destructive" className="mx-3 mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {/* Thread list */}
        <EmailThreadList
          threads={threads}
          selectedThreadId={selectedThread?.id}
          accountId={activeAccountId}
          isLoading={isLoadingThreads}
          hasMore={hasMore}
          onSelectThread={selectThread}
          onLoadMore={loadMore}
          onRefresh={syncNow}
          className="flex-1"
        />
      </div>

      {/* Main: Thread view */}
      <div className="flex-1 min-w-0 h-full">
        {selectedThread ? (
          <EmailChatThread
            thread={selectedThread}
            messages={messages}
            accountId={activeAccountId ?? ''}
            isLoading={isLoadingMessages}
            onBack={() => selectThread(null)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Mail className="h-12 w-12 opacity-20" />
            <div className="text-center">
              <p className="text-sm font-medium">Selecione um email</p>
              <p className="text-xs mt-1">Escolha uma conversa na lista ao lado</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
