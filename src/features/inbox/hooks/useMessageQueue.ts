import { useState, useCallback, useRef, useEffect } from 'react';
import { getLogger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';
import { toast } from '@/hooks/use-toast';

const log = getLogger('useMessageQueue');

export interface QueueItem {
  id: string;
  contactId: string;
  content: string;
  type: 'text' | 'attachment' | 'audio';
  attachments?: File[];
  onProgress?: (p: number) => void;
  status: 'pending' | 'sending' | 'failed' | 'confirmed';
  error?: any;
  retryCount: number;
  progress?: number;
  externalId?: string;
  createdAt: number;
  completedAt?: number;
  attempts: Array<{
    timestamp: number;
    error?: string;
    duration?: number;
  }>;
}

export interface QueueMetrics {
  totalSent: number;
  totalFailed: number;
  totalRetries: number;
  averageLatency: number;
  byType: Record<string, { sent: number; failed: number; latency: number[] }>;
  byConversation: Record<string, { sent: number; failed: number; latency: number[] }>;
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
          attachments: undefined // Arquivos File não são serializáveis
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

    // Tentar pegar o próximo item da fila sem criar um loop infinito de dependência
    // isProcessingRef garante que não rodamos em paralelo para o mesmo contato
    let nextItem: QueueItem | undefined;
    
    // Precisamos de uma forma de ler o estado atual do queue sem depender dele
    // Como estamos dentro de um useCallback que será chamado por um useEffect,
    // podemos usar um truque ou simplesmente aceitar que o useEffect gatilha a primeira vez.
    // Mas para o processamento sequencial, precisamos ler o estado atualizado.
    
    // Abordagem: processQueueForContact será disparado pelo useEffect quando o queue mudar,
    // mas ele mesmo só age se isProcessingRef estiver false.
  }, [processMessage]);

  // Versão corrigida e simplificada do processamento
  const processNextInQueue = useCallback(async (contactId: string) => {
    if (isProcessingRef.current[contactId]) return;

    // Encontrar o próximo item pendente para este contato
    setQueue(currentQueue => {
      const contactQueue = currentQueue.filter(item => item.contactId === contactId);
      const itemToProcess = contactQueue.find(item => item.status === 'pending');

      if (!itemToProcess) return currentQueue;

      // Se achamos um item, marcamos como enviando e iniciamos o processo fora do setQueue
      isProcessingRef.current[contactId] = true;
      
      // Iniciamos o processamento assíncrono
      (async () => {
        const startTime = Date.now();
        try {
          log.info(`Processing message ${itemToProcess.id} for contact ${contactId}`);
          
          // Marcamos como 'sending' no estado
          setQueue(q => q.map(i => i.id === itemToProcess.id ? { ...i, status: 'sending', progress: 0 } : i));
          
          await processMessage(itemToProcess);
          
          const duration = Date.now() - startTime;
          setQueue(q => q.map(i => 
            i.id === itemToProcess.id ? { 
              ...i, 
              status: 'confirmed', 
              progress: 100,
              attempts: [...(i.attempts || []), { timestamp: Date.now(), duration }]
            } : i
          ));
          
          // Remover confirmados após 5s
          setTimeout(() => {
            setQueue(q => q.filter(i => i.id !== itemToProcess.id));
          }, 5000);

          log.info(`Message ${itemToProcess.id} processed successfully`);
        } catch (err) {
          const duration = Date.now() - startTime;
          const errorMsg = err instanceof Error ? err.message : String(err);
          log.error(`Failed to process message ${itemToProcess.id}:`, err);
          
          const shouldAutoRetry = itemToProcess.retryCount < MAX_AUTO_RETRIES;
          
          setQueue(q => q.map(i => 
            i.id === itemToProcess.id ? { 
              ...i, 
              status: shouldAutoRetry ? 'pending' : 'failed',
              retryCount: i.retryCount + (shouldAutoRetry ? 1 : 0),
              error: err,
              progress: 0,
              attempts: [...(i.attempts || []), { timestamp: Date.now(), error: errorMsg, duration }]
            } : i
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
          // Tentar processar o próximo após um pequeno delay
          setTimeout(() => processNextInQueue(contactId), 100);
        }
      })();

      return currentQueue; // O estado será atualizado dentro do bloco assíncrono
    });
  }, [processMessage]);

  // Disparar processamento quando a fila mudar
  useEffect(() => {
    const contactIds = Array.from(new Set(queue.filter(i => i.status === 'pending').map(i => i.contactId)));
    contactIds.forEach(id => {
      if (!isProcessingRef.current[id]) {
        processNextInQueue(id);
      }
    });
  }, [queue, processNextInQueue]);

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
        progress: 0 
      } : item
    ));
  }, []);

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
