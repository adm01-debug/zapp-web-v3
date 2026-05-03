import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/features/auth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
}

export function WhisperMode({ contactId, targetAgentId, className, defaultExpanded = false }: WhisperModeProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isSupervisor = profile?.role === 'admin' || profile?.role === 'supervisor';

  // Fetch whisper messages for this contact
  const { data: whispers = [] } = useQuery({
    queryKey: ['whispers', contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whisper_messages')
        .select('id, content, sender_id, is_read, created_at')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (!data) return [];

      const senderIds = [...new Set(data.map(w => w.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', senderIds);

      const nameMap = new Map((profiles || []).map(p => [p.id, p.name]));
      
      return data.map(w => ({
        ...w,
        sender_name: nameMap.get(w.sender_id) || 'Supervisor',
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
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'whisper_messages',
        filter: `contact_id=eq.${contactId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['whispers', contactId] });
        setIsExpanded(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contactId, queryClient]);

  // Mark as read when viewing
  useEffect(() => {
    if (isExpanded && whispers.some(w => !w.is_read)) {
      const markAsRead = async () => {
        const { error } = await supabase
          .from('whisper_messages')
          .update({ is_read: true })
          .eq('contact_id', contactId)
          .eq('is_read', false);
        
        if (!error) {
          queryClient.setQueryData(['whispers', contactId], (old: WhisperMessage[] | undefined) => 
            old?.map(w => ({ ...w, is_read: true }))
          );
        }
      };
      markAsRead();
    }
  }, [isExpanded, whispers, contactId, queryClient]);

  const unreadCount = whispers.filter(w => !w.is_read).length;

  const sendWhisper = async () => {
    if (!message.trim() || !profile?.id) return;

    const agentId = targetAgentId || profile.id;

    const { error } = await supabase.from('whisper_messages').insert({
      contact_id: contactId,
      sender_id: profile.id,
      target_agent_id: agentId,
      content: message.trim(),
    });

    if (error) {
      toast({ title: 'Erro ao enviar sussurro', description: error.message, variant: 'destructive' });
    } else {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['whispers', contactId] });
    }
  };

  if (!isSupervisor && whispers.length === 0) return null;

  return (
    <div className={cn("relative flex items-center", className)} role="region" aria-label="Modo Sussurro">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "relative gap-1.5 text-xs transition-all duration-200",
          isExpanded ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "text-muted-foreground hover:text-foreground"
        )}
        title="Modo Sussurro — Notas internas invisíveis ao cliente (Alt+W)"
        aria-expanded={isExpanded}
        aria-haspopup="dialog"
      >
        <EyeOff className={cn("w-3.5 h-3.5", isExpanded && "animate-pulse")} />
        <span className="hidden sm:inline">Sussurro</span>
        {unreadCount > 0 && (
          <Badge 
            variant="destructive" 
            className="h-4 min-w-[16px] px-1 text-[9px] flex items-center justify-center animate-bounce"
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
            className="absolute bottom-full right-0 mb-3 z-[100] bg-card border border-amber-200/50 rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5"
            style={{ width: 340 }}
            role="dialog"
            aria-modal="true"
            aria-label="Painel de Sussurro"
          >
            <div className="p-3 bg-amber-50/50 border-b border-amber-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Equipe — Interno
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 hover:bg-amber-100 text-amber-600" 
                onClick={() => setIsExpanded(false)}
                aria-label="Fechar sussurro"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div 
              className="max-h-[300px] overflow-y-auto p-3 space-y-3 bg-gradient-to-b from-amber-50/20 to-transparent flex flex-col-reverse relative"
              role="log"
              aria-live="polite"
            >
              {/* Overlay visual para o modo interno */}
              <div className="sticky top-0 z-10 bg-amber-100/80 backdrop-blur-sm border border-amber-200/50 rounded-lg px-2 py-1 mb-2 flex items-center justify-center gap-1.5 shadow-sm">
                <EyeOff className="w-3 h-3 text-amber-700" />
                <span className="text-[9px] font-bold text-amber-800 uppercase tracking-tighter">Ambiente de Equipe — Privado</span>
              </div>

              {whispers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                  <EyeOff className="w-8 h-8 text-amber-200" />
                  <p className="text-xs text-amber-600/60 font-medium">Nenhum sussurro registrado para esta conversa.</p>
                </div>
              ) : (
                whispers.map((w, idx) => (
                  <motion.div 
                    key={w.id} 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex flex-col gap-1 group/whisper"
                  >
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold text-amber-600/80">{w.sender_name}</span>
                      <span className="text-[9px] text-muted-foreground/60">{new Date(w.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="relative text-xs p-2.5 rounded-2xl bg-amber-100/50 border border-amber-200/30 text-amber-900 shadow-sm leading-relaxed group-hover/whisper:bg-amber-100 transition-colors">
                      {w.content}
                      {/* Placeholder para futuras reações e threads internas */}
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {isSupervisor && (
              <div className="p-3 bg-background border-t border-border/40">
                <div className="relative flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Escreva uma orientação privada..."
                    aria-label="Mensagem de sussurro"
                    className="flex-1 min-h-[40px] max-h-[120px] bg-muted/30 border-none focus-visible:ring-1 focus-visible:ring-amber-400 rounded-xl p-2.5 text-xs resize-none placeholder:text-muted-foreground/50 transition-all"
                    onKeyDown={e => {
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
                    className="h-9 w-9 shrink-0 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-200" 
                    onClick={sendWhisper} 
                    disabled={!message.trim()}
                    aria-label="Enviar sussurro"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <p className="mt-2 text-[9px] text-center text-muted-foreground/60 font-medium italic">
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
