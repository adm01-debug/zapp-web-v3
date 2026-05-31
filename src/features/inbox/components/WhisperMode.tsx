// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Send, X, MessageSquare, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface WhisperModeProps {
  contactId: string;
  targetAgentId?: string;
  className?: string;
  defaultExpanded?: boolean;
}

interface WhisperMessage {
  id: string;
  content: string;
  sender_id: string;
  sender_name?: string;
  is_read: boolean;
  created_at: string;
  whisper_thread_id?: string;
  reply_count?: number;
}

export function WhisperMode({
  contactId,
  targetAgentId,
  className,
  defaultExpanded = false,
}: WhisperModeProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor';

  // Fetch whisper messages for this contact
  const { data: whispers = [] } = useQuery({
    queryKey: ['whispers', contactId],
    queryFn: async () => {
      let query = supabase
        .from('whisper_messages')
        .select(
          `
          id, content, sender_id, is_read, created_at, whisper_thread_id
        `
        )
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (activeThreadId) {
        query = query.or(`id.eq.${activeThreadId},whisper_thread_id.eq.${activeThreadId}`);
      } else {
        query = query.is('whisper_thread_id', null);
      }

      const { data, _error } = await (query as any).limit(50);

      if (!data) return [];

      const senderIds = [...new Set(data.map((w: any) => w.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', senderIds);

      const nameMap = new Map((profiles || []).map((p) => [p.id, p.name]));

      const threadCounts: Record<string, number> = {};
      if (!activeThreadId && data.length > 0) {
        const parentIds = data.map((d: any) => d.id);
        const { data: counts } = await supabase
          .from('whisper_messages')
          .select('whisper_thread_id')
          .in('whisper_thread_id', parentIds);

        counts?.forEach((c: any) => {
          if (c.whisper_thread_id) {
            threadCounts[c.whisper_thread_id] = (threadCounts[c.whisper_thread_id] || 0) + 1;
          }
        });
      }

      return data.map((w: any) => ({
        ...w,
        sender_name: nameMap.get(w.sender_id) || 'Supervisor',
        reply_count: threadCounts[w.id] || 0,
      })) as WhisperMessage[];
    },
    refetchInterval: 10000,
  });

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isExpanded]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`whisper-${contactId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'whisper_messages',
          filter: `contact_id=eq.${contactId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whispers', contactId] });
          setIsExpanded(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contactId, queryClient]);

  // Mark as read when viewing
  useEffect(() => {
    if (isExpanded && whispers.some((w) => !w.is_read)) {
      const markAsRead = async () => {
        const { error } = await supabase
          .from('whisper_messages')
          .update({ is_read: true })
          .eq('contact_id', contactId)
          .eq('is_read', false);

        if (!error) {
          queryClient.setQueryData(['whispers', contactId], (old: WhisperMessage[] | undefined) =>
            old?.map((w) => ({ ...w, is_read: true }))
          );
        }
      };
      markAsRead();
    }
  }, [isExpanded, whispers, contactId, queryClient]);

  const unreadCount = whispers.filter((w) => !w.is_read).length;

  const sendWhisper = async () => {
    if (!message.trim() || !profile?.id) return;

    const agentId = targetAgentId || profile.id;

    const { error } = await supabase.from('whisper_messages').insert({
      contact_id: contactId,
      sender_id: profile.id,
      target_agent_id: agentId,
      content: message.trim(),
      whisper_thread_id: activeThreadId,
    });

    if (error) {
      toast({
        title: 'Erro ao enviar sussurro',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['whispers', contactId] });
    }
  };

  if (!isSupervisor && whispers.length === 0) return null;

  return (
    <div
      className={cn('relative flex items-center', className)}
      role="region"
      aria-label="Modo Sussurro"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'relative gap-1.5 text-xs transition-all duration-200',
          isExpanded
            ? 'bg-warning text-warning-foreground hover:bg-warning'
            : 'text-muted-foreground hover:text-foreground'
        )}
        title="Modo Sussurro — Notas internas invisíveis ao cliente (Alt+W)"
        aria-expanded={isExpanded}
        aria-haspopup="dialog"
      >
        <EyeOff className={cn('h-3.5 w-3.5', isExpanded && 'animate-pulse')} />
        <span className="hidden sm:inline">Sussurro</span>
        {unreadCount > 0 && (
          <Badge
            variant="destructive"
            className="flex h-4 min-w-[16px] animate-bounce items-center justify-center px-1 text-[9px]"
            aria-label={`${unreadCount} novas mensagens de sussurro`}
          >
            {unreadCount}
          </Badge>
        )}
      </Button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full right-0 z-[100] mb-3 overflow-hidden rounded-xl border border-warning/50 bg-card shadow-2xl ring-1 ring-black/5"
            style={{ width: 340 }}
            role="dialog"
            aria-modal="true"
            aria-label="Painel de Sussurro"
          >
            <div className="flex items-center justify-between border-b border-warning bg-warning/50 p-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-warning-foreground">
                {activeThreadId ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-1 h-6 w-6 text-warning-foreground hover:bg-warning"
                    onClick={() => setActiveThreadId(null)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="h-2 w-2 animate-pulse rounded-full bg-warning" />
                )}
                {activeThreadId ? 'Discussão em Thread' : 'Equipe — Interno'}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-warning-foreground hover:bg-warning"
                onClick={() => {
                  setIsExpanded(false);
                  setActiveThreadId(null);
                }}
                aria-label="Fechar sussurro"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div
              className="relative flex max-h-[300px] flex-col-reverse space-y-3 overflow-y-auto bg-gradient-to-b from-amber-50/20 to-transparent p-3"
              role="log"
              aria-live="polite"
            >
              {/* Overlay visual para o modo interno */}
              <div className="sticky top-0 z-10 mb-2 flex items-center justify-center gap-1.5 rounded-lg border border-warning/50 bg-warning/80 px-2 py-1 shadow-sm backdrop-blur-sm">
                <EyeOff className="h-3 w-3 text-warning-foreground" />
                <span className="text-[9px] font-bold uppercase tracking-tighter text-warning-foreground">
                  Ambiente de Equipe — Privado
                </span>
              </div>

              {whispers.length === 0 ? (
                <div className="flex flex-col items-center justify-center space-y-2 py-8 text-center">
                  <EyeOff className="h-8 w-8 text-warning-foreground" />
                  <p className="text-xs font-medium text-warning-foreground/60">
                    Nenhum sussurro registrado para esta conversa.
                  </p>
                </div>
              ) : (
                whispers.map((w, idx) => {
                  const isParent = w.id === activeThreadId;
                  return (
                    <motion.div
                      key={w.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        'group/whisper flex flex-col gap-1',
                        isParent && 'rounded-r-xl border-l-2 border-warning bg-warning/30 py-1 pl-3'
                      )}
                    >
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[10px] font-bold text-warning-foreground/80">
                          {w.sender_name}{' '}
                          {isParent && (
                            <Badge
                              variant="outline"
                              className="ml-1 h-3 border-warning bg-warning px-1 text-[8px]"
                            >
                              PAI
                            </Badge>
                          )}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60">
                          {new Date(w.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="relative rounded-2xl border border-warning/30 bg-warning/50 p-2.5 text-xs leading-relaxed text-warning-foreground shadow-sm transition-colors group-hover/whisper:bg-warning">
                        {w.content}

                        <div className="absolute -bottom-1.5 -right-1 z-20 flex items-center gap-0.5 rounded-full border border-warning bg-background px-1 opacity-0 shadow-sm transition-opacity group-hover/whisper:opacity-100">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => toast({ title: '👍 Confirmado' })}
                                  className="hover:scale-120 transition-transform"
                                >
                                  👍
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="p-1 text-[10px]">Confirmar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => toast({ title: '👀 Ciente' })}
                                  className="hover:scale-120 transition-transform"
                                >
                                  👀
                                </button>
                              </TooltipTrigger>
                              <TooltipContent className="p-1 text-[10px]">Ciente</TooltipContent>
                            </Tooltip>
                            {!activeThreadId && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setActiveThreadId(w.id)}
                                    className="hover:scale-120 ml-0.5 p-0.5 text-warning-foreground transition-transform"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent className="p-1 text-[10px]">
                                  Responder em Thread
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </TooltipProvider>
                        </div>

                        {!activeThreadId && w.reply_count && w.reply_count > 0 ? (
                          <button
                            onClick={() => setActiveThreadId(w.id)}
                            className="mt-1 flex items-center gap-1 text-[9px] font-bold text-warning-foreground transition-colors hover:text-warning-foreground"
                          >
                            <MessageSquare className="h-2.5 w-2.5" />
                            {w.reply_count} {w.reply_count === 1 ? 'resposta' : 'respostas'}
                          </button>
                        ) : null}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {isSupervisor && (
              <div className="border-t border-border/40 bg-background p-3">
                <div className="relative flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      activeThreadId
                        ? 'Responder na thread...'
                        : 'Escreva uma orientação privada...'
                    }
                    aria-label={activeThreadId ? 'Resposta de thread' : 'Mensagem de sussurro'}
                    className="max-h-[120px] min-h-[40px] flex-1 resize-none rounded-xl border-none bg-muted/30 p-2.5 text-xs transition-all placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-amber-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendWhisper();
                      }
                      if (e.key === 'Escape') {
                        setIsExpanded(false);
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl bg-warning text-foreground shadow-lg shadow-amber-200 hover:bg-warning"
                    onClick={sendWhisper}
                    disabled={!message.trim()}
                    aria-label="Enviar sussurro"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="mt-2 text-center text-[9px] font-medium italic text-muted-foreground/60">
                  * Apenas agentes e supervisores podem ver estas mensagens.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
