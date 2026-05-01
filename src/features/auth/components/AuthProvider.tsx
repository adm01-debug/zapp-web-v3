import { useState, useEffect, useCallback, useRef, createContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { authService, Profile } from '../services/authService';
import { log } from '@/lib/logger';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);

  const fetchProfile = useCallback(async (userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data, error } = await authService.getProfile(userId);
      if (!error && data) {
        setProfile(data);
      }
    } catch (err: unknown) {
      log.warn('[Auth] Failed to fetch profile for user:', userId, err);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const subscription = authService.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        try {
          Object.keys(localStorage)
            .filter((k) => k.startsWith('sb-') && k.includes('-auth-token'))
            .forEach((k) => localStorage.removeItem(k));
        } catch (e) {
          log.warn('[Auth] Failed to clear stale auth tokens', e);
        }
      }

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setProfile(null);
      }
    });

    authService.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    }).catch((err) => {
      log.warn('[Auth] getSession failed, clearing local session', err);
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith('sb-') && k.includes('-auth-token'))
          .forEach((k) => localStorage.removeItem(k));
      } catch { /* noop */ }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      fetchingRef.current = false;
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    return await authService.signIn(email, password);
  };

  const signUp = async (email: string, password: string, name: string) => {
    return await authService.signUp(email, password, name);
  };

  const signOut = async () => {
    await authService.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
