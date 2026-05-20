import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { log } from '@/lib/logger';

const ONBOARDING_KEY = 'onboarding_completed';

export function useOnboarding() {
  const { user } = useAuth();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Check localStorage first for quick response
    let localCompleted: string | null = null;
    try { localCompleted = localStorage.getItem(`${ONBOARDING_KEY}_${user.id}`); } catch { /* storage unavailable */ }
    if (localCompleted === 'true') {
      setHasCompletedOnboarding(true);
      setLoading(false);
      return;
    }

    // Check user_settings in database
    const checkOnboarding = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        // If user has settings, they've been here before
        if (data) {
          setHasCompletedOnboarding(true);
          try { localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, 'true'); } catch { /* storage unavailable */ }
        } else {
          setHasCompletedOnboarding(false);
        }
      } catch (error) {
        log.error('Error checking onboarding status:', error);
        setHasCompletedOnboarding(true); // Default to completed on error
      } finally {
        setLoading(false);
      }
    };

    checkOnboarding();
  }, [user]);

  const completeOnboarding = () => {
    if (user) {
      try { localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, 'true'); } catch { /* storage unavailable */ }
      setHasCompletedOnboarding(true);
    }
  };

  const resetOnboarding = () => {
    if (user) {
      try { localStorage.removeItem(`${ONBOARDING_KEY}_${user.id}`); } catch { /* storage unavailable */ }
      setHasCompletedOnboarding(false);
    }
  };

  return {
    hasCompletedOnboarding,
    loading,
    completeOnboarding,
    resetOnboarding,
  };
}
