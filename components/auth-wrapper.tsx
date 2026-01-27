// components/auth-wrapper.tsx

'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';  // ← Make sure this import exists

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    async function init() {
      if (!supabase) {
        router.push('/');
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session && !window.location.pathname.startsWith('/phase1b')) {
        router.push('/');
      }
      setLoading(false);
    }
    init();

    if (!supabase) return () => {}; // Early cleanup

    const { data: authListener } = supabase.auth.onAuthStateChange(
      // Add types here ↓↓↓
      (_event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
        if (!newSession && !window.location.pathname.startsWith('/phase1b')) {
          router.push('/');
        }
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, [supabase, router]);

  if (loading) {
    console.log('AuthWrapper: Loading...');
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  const path = window.location.pathname;
  if (path === '/') {
    console.log('AuthWrapper: At login path - rendering children');
    return <>{children}</>; // Bypass guard for login form
  }

  if (!session) {
    console.log('AuthWrapper: No session at path:', path);
    return <div className="flex min-h-screen items-center justify-center">Unauthorized - Redirecting...</div>;
  }

  return <>{children}</>;
}