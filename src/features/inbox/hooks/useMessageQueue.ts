import { useState, useCallback, useRef, useEffect } from 'react';
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
  status: 'pending' | 'sending' | 'failed' | 'confirmed';
  error?: any;
  retryCount: number;
  progress?: number;
  externalId?: string;
  createdAt: number;
  attempts: Array<{
    timestamp: number;
    error?: string;
    duration?: number;
  }>;
}

export function useMessageQueue(processMessage: (item: QueueItem) => Promise<void>) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const isProcessingRef = useRef<Record<string, boolean>>({});
  const MAX_AUTO_RETRIES = 2;
  const QUEUE_STORAGE_KEY = 'chat_message_queue';

  // Persistência: Carregar fila ao iniciar
  useEffect(() => {
    const savedQueue = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (savedQueue) {
      try {
        const parsed = JSON.parse(savedQueue) as QueueItem[];
        // Marcar itens que estavam 'sending' como 'failed' ou 'pending' para retomar
        const restored = parsed.map(item => ({
          ...item,
          status: item.status === 'sending' ? 'pending' : item.status,
          progress: item.status === 'sending' ? 0 : item.progress,
          attachments: undefined // Arquivos File não são serializáveis, precisam ser re-anexados ou perdidos
        }));
        setQueue(restored);
        log.info('Restored message queue from localStorage');
      } catch (e) {
        log.error('Failed to parse saved queue', e);
      }
    }
  }, []);

  // Persistência: Salvar fila ao mudar
  useEffect(() => {
    const queueToSave = queue.map(item => ({
      ...item,
      attachments: undefined // Não serializável
    }));
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queueToSave));
  }, [queue]);

  const processQueueForContact = useCallback(async (contactId: string) => {
    if (isProcessingRef.current[contactId]) return;

    const contactQueue = queue.filter(item => item.contactId === contactId);
    const nextItem = contactQueue.find(item => item.status === 'pending');
    
    if (!nextItem) return;

    isProcessingRef.current[contactId] = true;
    const startTime = Date.now();
    
    setQueue(prev => prev.map(item => 
      item.id === nextItem.id ? { ...item, status: 'sending', progress: 0 } : item
    ));

    try {
      log.info(`Processing message ${nextItem.id} for contact ${contactId}`);
      await processMessage(nextItem);
      
      const duration = Date.now() - startTime;
      setQueue(prev => prev.map(item => 
        item.id === nextItem.id ? { 
          ...item, 
          status: 'confirmed', 
          progress: 100,
          attempts: [...(item.attempts || []), { timestamp: Date.now(), duration }]
        } : item
      ));
      
      // Remove confirmed items after some time to keep UI clean but show confirmation
      setTimeout(() => {
        setQueue(prev => prev.filter(item => item.id !== nextItem.id));
      }, 5000);

      log.info(`Message ${nextItem.id} processed successfully`);
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMsg = err instanceof Error ? err.message : String(err);
      log.error(`Failed to process message ${nextItem.id}:`, err);
      
      const shouldAutoRetry = nextItem.retryCount < MAX_AUTO_RETRIES;
      
      setQueue(prev => prev.map(item => 
        item.id === nextItem.id ? { 
          ...item, 
          status: shouldAutoRetry ? 'pending' : 'failed',
          retryCount: item.retryCount + (shouldAutoRetry ? 1 : 0),
          error: err,
          progress: 0,
          attempts: [...(item.attempts || []), { timestamp: Date.now(), error: errorMsg, duration }]
        } : item
      ));

      if (!shouldAutoRetry) {
        toast({
          title: "Falha no envio",
          description: "Não foi possível enviar a mensagem. Tente novamente.",
          variant: "destructive"
        });
      }
    } finally {
      isProcessingRef.current[contactId] = false;
      setTimeout(() => processQueueForContact(contactId), 100);
    }
  }, [queue, processMessage]);

  // Trigger processing for all active contacts in queue
  useEffect(() => {
    const contactIds = Array.from(new Set(queue.filter(i => i.status === 'pending').map(i => i.contactId)));
    contactIds.forEach(id => processQueueForContact(id));
  }, [queue, processQueueForContact]);

  const addToQueue = useCallback((contactId: string, content: string, attachments?: File[]) => {
    const newItem: QueueItem = {
      id: `queue:${uuidv4()}`,
      contactId,
      content,
      attachments,
      status: 'pending',
      retryCount: 0,
      progress: 0,
      createdAt: Date.now(),
      attempts: []
    };
    
    setQueue(prev => [...prev, newItem]);
    log.info(`Added message to queue: ${newItem.id}`);
  }, []);

  const updateProgress = useCallback((id: string, progress: number) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { ...item, progress } : item
    ));
  }, []);

  const retryMessage = useCallback((id: string) => {
    setQueue(prev => prev.map(item => 
      item.id === id ? { 
        ...item, 
        status: 'pending', 
        error: undefined, 
        retryCount: 0, 
        progress: 0 // Garantir que zera o progresso no retry
      } : item
    ));
  }, []);

  // Reconciliação: Remover da fila se uma confirmação externa chegar
  const reconcileWithDelivery = useCallback((contactId: string, externalId: string) => {
    setQueue(prev => prev.filter(item => 
      !(item.contactId === contactId && item.externalId === externalId)
    ));
  }, []);

  return {
    queue,
    addToQueue,
    retryMessage,
    updateProgress,
    reconcileWithDelivery,
    removeFromQueue: (id: string) => {
      setQueue(prev => prev.filter(item => item.id !== id));
    }
  };
}
