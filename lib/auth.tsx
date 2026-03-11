import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
  pendingEmailVerification: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function getEmailRedirectTo(path: string) {
  if (Platform.OS === 'web') {
    return `${window.location.origin}${path}`;
  }
  // Matches app.json scheme: fastshot
  return `fastshot:/${path}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [pendingEmailVerification, setPendingEmailVerification] = useState(false);

  useEffect(() => {
    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
        setIsInitialized(true);
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
        setIsInitialized(true);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    setPendingEmailVerification(false);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setIsLoading(false);

    if (signInError) {
      setError(new Error(signInError.message));
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    setPendingEmailVerification(false);

    const emailRedirectTo = getEmailRedirectTo('/auth/callback');

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });

    setIsLoading(false);

    if (signUpError) {
      setError(new Error(signUpError.message));
      return;
    }

    // If the project requires email confirmation, session will be null.
    if (!data.session && data.user) {
      setPendingEmailVerification(true);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setPendingEmailVerification(false);

    const { error: signOutError } = await supabase.auth.signOut();

    setIsLoading(false);

    if (signOutError) {
      setError(new Error(signOutError.message));
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isInitialized,
      isLoading,
      error,
      pendingEmailVerification,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      clearError,
    }),
    [
      session,
      isInitialized,
      isLoading,
      error,
      pendingEmailVerification,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider />');
  return ctx;
}
