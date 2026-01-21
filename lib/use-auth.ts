// lib/use-auth.ts (NEW: Centralized auth hook to manage Supabase session, loading, and auth state changes across components/pages)
// Replaces duplicated session logic in dashboard/page.tsx, app/page.tsx, and potentially phase-hook.ts (for further consolidation)
// Exports: session, loading, and optional logout handler for consistency

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    async function initSession() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);

      if (!session && !window.location.pathname.startsWith('/phase1b')) {
        router.push('/');
      }
    }

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession && !window.location.pathname.startsWith('/phase1b')) {
        router.push('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const logout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    router.push('/');
  };

  return { session, loading, logout };
}