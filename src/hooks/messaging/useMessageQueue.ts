import { useState, useCallback, useRef, useEffect } from 'react';
import { useEvolutionApi } from '@/hooks/useEvolutionApi';
import { eventBus } from '@/lib/eventBus';
import { log } from '@/lib/logger';
import { useToast } from '@/hooks/use-toast';

export interface PendingMessage {
  id: string;
  remote_jid: string;
  content: string;
  status: 'pending' | 'sending' | 'failed';
  timestamp: number;
}

export function useMessageQueue(instanceName: string = 'wpp2') {
  const { sendMessage } = useEvolutionApi();
  const { toast } = useToast();
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const queueRef = useRef<PendingMessage[]>([]);
  const isProcessingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queueRef.current.length === 0) return;
    
    isProcessingRef.current = true;
    
    while (queueRef.current.length > 0) {
      const msg = queueRef.current[0];
      
      // Update status to sending
      setPendingMessages(prev => 
        prev.map(p => p.id === msg.id ? { ...p, status: 'sending' } : p)
      );

      try {
        await sendMessage({
          instanceName,
          remoteJid: msg.remote_jid,
          message: { text: msg.content }
        });
        
        // Remove from queue after successful send
        // Note: We don't remove from pendingMessages state yet, 
        // we wait for the realtime event to avoid flickering (deduplication)
        // BUT if realtime is slow, we might want to remove it after a timeout
        queueRef.current.shift();
        
        // Success!
        log.info(`[MessageQueue] Sent message ${msg.id}`);
        
        // Optional: remove after a small delay if no realtime message arrived
        setTimeout(() => {
          setPendingMessages(prev => prev.filter(p => p.id !== msg.id));
        }, 3000);
        
      } catch (err) {
        log.error(`[MessageQueue] Failed to send ${msg.id}:`, err);
        
        setPendingMessages(prev => 
          prev.map(p => p.id === msg.id ? { ...p, status: 'failed' } : p)
        );
        
        toast({
          title: 'Erro ao enviar mensagem',
          description: 'A mensagem será tentada novamente em breve.',
          variant: 'destructive'
        });
        
        // Move to end of queue or wait? 
        // For now, let's stop and wait for a manual retry or backoff
        break;
      }
    }
    
    isProcessingRef.current = false;
  }, [instanceName, sendMessage, toast]);

  const enqueueMessage = useCallback((remote_jid: string, content: string) => {
    const id = `pending_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const newMsg: PendingMessage = {
      id,
      remote_jid,
      content,
      status: 'pending',
      timestamp: Date.now()
    };
    
    queueRef.current.push(newMsg);
    setPendingMessages(prev => [...prev, newMsg]);
    
    processQueue();
    return id;
  }, [processQueue]);

  // Clean up pending messages when real messages arrive
  useEffect(() => {
    const unsub = eventBus.on('message:received', ({ contactId }) => {
      // If we receive a message from the same contact, we might want to clear old pending ones
      // This is a simple deduplication strategy
      setPendingMessages(prev => prev.filter(p => p.remote_jid !== contactId));
    });
    return unsub;
  }, []);

  return {
    pendingMessages,
    enqueueMessage,
    retryMessage: processQueue
  };
}
