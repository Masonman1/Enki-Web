// lib/use-auth.ts (UPDATED: Added error handling, isMounted guard, and debug logs for loop prevention; ensured redirect exclusion works robustly)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js'; // NEW: Add AuthChangeEvent for typing
import toast from 'react-hot-toast'; // Assuming imported for error UI; add if needed

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (!supabase) {
        console.error('No Supabase client - check env vars');
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          console.log('Initial session:', session ? 'Present' : 'Null');
          setSession(session);
          setLoading(false);
        }
      } catch (err) {
        console.error('Session init error:', err);
        toast.error('Session failed - check connection');
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    if (!supabase) return () => {}; // Early cleanup if no client

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, newSession: Session | null) => {
      if (isMounted) {
        setSession(newSession);
        const path = window.location.pathname;
        if (!newSession && !path.startsWith('/phase1b') && path !== '/') {
          console.log('State change redirect to / from path:', path);
          router.push('/');
        } else if (path === '/') {
          console.log('State change redirect skipped: already at /');
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const logout = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
      toast.error('Logout failed');
    }
  };

  return { session, loading, logout };
}