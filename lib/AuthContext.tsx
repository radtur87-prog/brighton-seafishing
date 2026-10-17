import { createContext, useContext, useEffect, useMemo, useState, PropsWithChildren } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { openedFromRecoveryLink, supabase } from '@/lib/supabase';
import { errorMessage } from '@/lib/errors';

export type SignUpResult =
  | { status: 'signed_in' }
  | { status: 'confirm_email' }
  | { status: 'error'; message: string };

const PUBLIC_APP_URL = 'https://radtur87-prog.github.io/brighton-seafishing/';

/** Where the password-reset e-mail link should land: this app (wherever it is hosted). */
export function appUrl(): string {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return PUBLIC_APP_URL;
  const base = (Constants.expoConfig?.experiments?.baseUrl ?? '').replace(/\/$/, '');
  return `${window.location.origin}${base}/`;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  /** True after opening the reset-password link until a new password is saved. */
  recovering: boolean;
  requestPasswordReset: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(openedFromRecoveryLink);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      if (event === 'SIGNED_OUT') setRecovering(false);
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
      recovering,
      requestPasswordReset: async (email) => {
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() });
          return error ? errorMessage(error, 'E-mail sa nepodarilo odoslať.') : null;
        } catch (e) {
          return errorMessage(e, 'E-mail sa nepodarilo odoslať.');
        }
      },
      updatePassword: async (password) => {
        try {
          const { error } = await supabase.auth.updateUser({ password });
          if (error) return errorMessage(error, 'Heslo sa nepodarilo zmeniť.');
          setRecovering(false);
          return null;
        } catch (e) {
          return errorMessage(e, 'Heslo sa nepodarilo zmeniť.');
        }
      },
    }),
    [session, loading, recovering]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth musí byť použitý vnútri AuthProvider');
  return ctx;
}
