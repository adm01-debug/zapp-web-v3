import { onLCP, onFID, onCLS, onINP, Metric } from 'web-vitals';
import { log } from './logger';
import { supabase } from '@/integrations/supabase/client';

const sendToObservability = async (metric: Metric) => {
  const { name, value, id } = metric;
  
  // Log local estruturado
  log.info('Web Vital Metric', { name, value, id });

  // Envio para edge function de observabilidade
  try {
    await supabase.functions.invoke('client-observability', {
      body: { 
        type: 'web-vital',
        metric: { name, value, id, path: window.location.pathname } 
      }
    });
  } catch (err) {
    // Falha silenciosa para não quebrar a UI
  }
};

export const initWebVitals = () => {
  if (import.meta.env.PROD) {
    onLCP(sendToObservability);
    onFID(sendToObservability);
    onCLS(sendToObservability);
    onINP(sendToObservability);
  }
};
