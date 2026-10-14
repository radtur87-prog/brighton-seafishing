import { createContext, useContext, useEffect, useMemo, useState, PropsWithChildren } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';

export type SignUpResult =
  | { status: 'signed_in' }
  | { status: 'confirm_email' }
  | { status: 'error'; message: string };

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn: async (email, password) => {
        try {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          return error ? errorMessage(error, 'Prihlásenie zlyhalo.') : null;
        } catch (e) {
          return errorMessage(e, 'Prihlásenie zlyhalo.');
        }
      },
      signUp: async (email, password) => {
        try {
          const { data, error } = await supabase.auth.signUp({ email, password });
          if (error) return { status: 'error', message: errorMessage(error, 'Registrácia zlyhala.') };
          if (data.session) return { status: 'signed_in' };
          // Supabase hides "already registered" behind a user with no identities.
          if (data.user && data.user.identities?.length === 0) {
            return { status: 'error', message: 'Tento e-mail je už zaregistrovaný. Prihlás sa.' };
          }
          return { status: 'confirm_email' };
        } catch (e) {
          return { status: 'error', message: errorMessage(e, 'Registrácia zlyhala.') };
        }
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth musí byť použitý vnútri AuthProvider');
  return ctx;
}
