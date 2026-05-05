import { useState, useCallback, useRef } from 'react';
import { getLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';

const log = getLogger('useMessageQueue');

export interface QueueItem {
  id: string;
  contactId: string;
  content: string;
  attachments?: File[];
  onProgress?: (p: number) => void;
  status: 'pending' | 'sending' | 'failed';
  error?: any;
  retryCount: number;
}

export function useMessageQueue(processMessage: (item: QueueItem) => Promise<void>) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const isProcessingRef = useRef(false);
  const MAX_AUTO_RETRIES = 2;

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queue.length === 0) return;

    const nextItem = queue.find(item => item.status === 'pending');
    if (!nextItem) return;

    isProcessingRef.current = true;
    
    // Update status to sending
    setQueue(prev => prev.map(item => 
      item.id === nextItem.id ? { ...item, status: 'sending' } : item
    ));

    try {
      log.info(`Processing message in queue: ${nextItem.id}`);
      await processMessage(nextItem);
      
      // Remove from queue after successful process
      setQueue(prev => prev.filter(item => item.id !== nextItem.id));
      log.info(`Message ${nextItem.id} processed successfully`);
    } catch (err) {
      log.error(`Failed to process message ${nextItem.id}:`, err);
      
      const shouldAutoRetry = nextItem.retryCount < MAX_AUTO_RETRIES;
      
      if (shouldAutoRetry) {
        log.info(`Auto-retrying ${nextItem.id} (${nextItem.retryCount + 1}/${MAX_AUTO_RETRIES})`);
        setQueue(prev => prev.map(item => 
          item.id === nextItem.id ? { 
            ...item, 
            status: 'pending', 
            retryCount: item.retryCount + 1 
          } : item
        ));
      } else {
        // Update status to failed
        setQueue(prev => prev.map(item => 
          item.id === nextItem.id ? { ...item, status: 'failed', error: err } : item
        ));
        toast({
          title: "Falha no envio",
          description: "Não foi possível enviar a mensagem. Tente novamente.",
          variant: "destructive"
        });
      }
    } finally {
      isProcessingRef.current = false;
      // Process next item with a small delay to ensure state updates
      setTimeout(() => processQueue(), 100);
    }
  }, [queue, processMessage]);

  const addToQueue = useCallback((contactId: string, content: string, attachments?: File[], onProgress?: (p: number) => void) => {
    const newItem: QueueItem = {
      id: `queue:${uuidv4()}`,
      contactId,
      content,
      attachments,
      onProgress,
      status: 'pending',
      retryCount: 0
    };
    
    setQueue(prev => [...prev, newItem]);
    log.info(`Added message to queue: ${newItem.id}`);
    
    // Trigger queue processing
    setTimeout(() => processQueue(), 0);
  }, [processQueue]);

  const retryMessage = useCallback((id: string) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, status: 'pending', error: undefined, retryCount: 0 } : item
    ));
    setTimeout(() => processQueue(), 0);
  }, [processQueue]);

  return {
    queue,
    addToQueue,
    retryMessage,
    removeFromQueue: (id: string) => {
      setQueue(prev => prev.filter(item => item.id !== id));
    }
  };
}
