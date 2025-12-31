'use client'; // This makes it a client component for hooks

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase'; // Adjust path if needed (singleton hook)

interface AuthWrapperProps {
  children: ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      router.push('/'); // Redirect if no client (e.g., env issue)
      return;
    }

    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
      if (!session && !window.location.pathname.startsWith('/phase1b')) { // Allow guest for submittals hub; customize protected paths
        router.push('/');
      }
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session && !window.location.pathname.startsWith('/phase1b')) {
        router.push('/');
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [supabase, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>; // Customize loader (e.g., add shadcn/ui spinner)
  }

  return <>{children}</>; // Render children once auth is resolved
}