import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type IncidentType = 'invalid_signature' | 'auth_401' | 'auth_403';

export interface EvolutionIncident {
  id: string;
  instance_name: string;
  incident_type: IncidentType;
  http_status: number | null;
  source: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface IncidentsSummary {
  total: number;
  byType: Record<string, number>;
  byInstance: Record<string, number>;
}

export interface IncidentsResponse {
  windowHours: number;
  items: EvolutionIncident[];
  summary: { current: IncidentsSummary; previous: IncidentsSummary };
  generatedAt: string;
}

interface Filters {
  instance?: string;
  hours?: 1 | 6 | 24 | 168;
  type?: IncidentType | 'all';
}

export function useEvolutionIncidents(filters: Filters = {}) {
  const queryClient = useQueryClient();
  const { instance, hours = 24, type = 'all' } = filters;

  const queryKey = ['evolution-incidents', instance ?? 'all', hours, type];

  const query = useQuery<IncidentsResponse>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (instance) params.set('instance', instance);
      params.set('hours', String(hours));
      if (type && type !== 'all') params.set('type', type);

      // supabase.functions.invoke não suporta query string nativamente,
      // então fazemos fetch direto com credenciais da sessão.
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evolution-incidents?${params.toString()}`;
      const session = (await supabase.auth.getSession()).data.session;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ''}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as IncidentsResponse;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Realtime: invalida ao chegar incidente novo
  useEffect(() => {
    const channel = supabase
      .channel('evolution-incidents-rt')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'evolution_incidents' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['evolution-incidents'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
