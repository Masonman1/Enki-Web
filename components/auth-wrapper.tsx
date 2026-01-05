'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js'; // Import Session type from Supabase

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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession && !window.location.pathname.startsWith('/phase1b')) {
        router.push('/');
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabase, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return <div className="flex min-h-screen items-center justify-center">Unauthorized - Redirecting...</div>; // Use session to resolve unused warning
  }

  return <>{children}</>;
}