import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getLogger } from '@/lib/logger';

const log = getLogger('useInboxHeartbeat');

export function useInboxHeartbeat(userId: string | undefined) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [onlineStatus, setOnlineStatus] = useState<string>('offline');

  useEffect(() => {
    if (!userId) return;

    const updateStatus = async (status: string) => {
      setOnlineStatus(status);
      setIsOnline(status === 'online');
      
      const now = Date.now();
      const appWindow = window as Window & { __lastStatusUpdate?: number };
      const lastUpdate = appWindow.__lastStatusUpdate || 0;
      
      // Throttle updates: max every 30s unless going offline
      if (now - lastUpdate < 30000 && status !== 'offline') return;
      appWindow.__lastStatusUpdate = now;

      try {
        await supabase.from('profiles')
          .update({ 
            online_status: status as 'online' | 'offline' | 'busy',
            last_seen: new Date().toISOString()
          })
          .eq('id', userId);
      } catch (err) {
        log.error('Failed to update heartbeat status:', err);
      }
    };

    const handleVisibilityChange = () => {
      updateStatus(document.visibilityState === 'visible' ? 'online' : 'offline');
    };

    const handleOnline = () => {
      setIsOnline(true);
      updateStatus('online');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      updateStatus('offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status
    updateStatus('online');

    // Heartbeat every 60s while visible
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updateStatus('online');
      }
    }, 60000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
      updateStatus('offline');
    };
  }, [userId]);

  return { isOnline, onlineStatus };
}
