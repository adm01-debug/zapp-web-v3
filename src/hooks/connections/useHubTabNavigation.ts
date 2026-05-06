import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HubTab } from '@/components/connections/types';

/**
 * Hook para gerenciar o estado das abas do Hub de Conexões e Integrações via URL.
 */
export function useHubTabNavigation(isDev: boolean) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const validateTab = (t: string | null): HubTab => {
    if (t === 'bridge' && !isDev) return 'connections';
    if (t === 'connections' || t === 'integrations' || t === 'bridge') return t;
    return 'connections';
  };

  const [tab, setTab] = useState<HubTab>(() => validateTab(searchParams.get('tab')));

  // Sincroniza query param ao mudar aba
  useEffect(() => {
    const current = searchParams.get('tab');
    if (current !== tab) {
      setSearchParams(prev => {
        prev.set('tab', tab);
        return prev;
      }, { replace: true });
    }
  }, [tab, searchParams, setSearchParams]);

  // Sincroniza aba se query param mudar externamente (ex: botão voltar)
  useEffect(() => {
    const t = searchParams.get('tab');
    const validated = validateTab(t);
    if (validated !== tab) {
      setTab(validated);
    }
  }, [searchParams, isDev, tab]);

  return { tab, setTab };
}
