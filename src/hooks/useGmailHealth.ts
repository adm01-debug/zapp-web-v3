
import { useState, useEffect, useCallback } from 'react';
import { gmailHealthService } from '@/services/gmail/gmailHealthService';
import type { GmailHealthInfo } from '@/services/gmail/types';
import { useToast } from '@/hooks/use-toast';

export function useGmailHealth() {
  const [health, setHealth] = useState<GmailHealthInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadHealth = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await gmailHealthService.getHealthStatus();
      setHealth(data);
    } catch (err) {
      console.error('Falha ao carregar saúde do Gmail:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const forceRevalidation = async () => {
    try {
      await gmailHealthService.forceRevalidation();
      toast({
        title: 'Cache atualizado',
        description: 'A revalidação do schema foi forçada com sucesso.',
      });
      await loadHealth();
    } catch (err) {
      toast({
        title: 'Erro na revalidação',
        description: 'Não foi possível forçar a revalidação.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000); // 30s
    return () => clearInterval(interval);
  }, [loadHealth]);

  return {
    health,
    isLoading,
    refresh: loadHealth,
    forceRevalidation
  };
}
