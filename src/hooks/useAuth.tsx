import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { log } from '@/lib/logger';

/**
 * Custom DOM event dispatched on the window after a successful login
 * (Supabase `SIGNED_IN` event). Non-react-query hooks (e.g. the
 * `useConnectionsManager` polling loop) listen to it to re-fetch their
 * data without requiring a page reload.
 */
export const AUTH_POST_LOGIN_REFRESH_EVENT = 'zappweb:auth:post-login-refresh';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: string;
  max_chats: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const queryClient = useQueryClient();
  // Tracks the previously-known user id so we only fire the post-login refresh
  // on real auth transitions (null/different user → signed in), not on every
  // token refresh emitted by Supabase while the session is already established.
  const lastUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch (err: unknown) {
      log.warn('[Auth] Failed to fetch profile for user:', userId, err);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);

          // Trigger a full data refresh whenever this is a *new* signed-in
          // session (initial login or user switch). We deliberately skip
          // TOKEN_REFRESHED / USER_UPDATED events that share the same user id,
          // since those don't represent a fresh login and should not invalidate
          // every cached query in the app.
          const isFreshLogin =
            event === 'SIGNED_IN' && lastUserIdRef.current !== session.user.id;
          lastUserIdRef.current = session.user.id;

          if (isFreshLogin) {
            // Defer so subscribers (connections, inbox, contacts) mount and
            // register their listeners before we fire the refresh signal.
            setTimeout(() => {
              try {
                // Invalidate every react-query cache entry — covers chats,
                // contacts, conversations, channel-connections, etc.
                queryClient.invalidateQueries();
              } catch (err) {
                log.warn('[Auth] Failed to invalidate query cache after login', err);
              }
              window.dispatchEvent(new CustomEvent(AUTH_POST_LOGIN_REFRESH_EVENT));
            }, 0);
          }
        } else {
          setProfile(null);
          lastUserIdRef.current = null;
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        lastUserIdRef.current = session.user.id;
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      fetchingRef.current = false; // Reset guard to allow re-fetch
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name }
      }
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
