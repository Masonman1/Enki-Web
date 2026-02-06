// app/dashboard/page.tsx (UPDATED: Switched to Sonner for toasts; async logout with feedback)
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/use-auth";
import { useSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { toast } from 'sonner'; // NEW: Sonner for reliable toasts

export default function Dashboard() {
  const { session, loading: authLoading, logout: authLogout } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();

  const userId = session?.user?.id;

  useEffect(() => {
    if (authLoading || !supabase || !userId) return;

    if (!session) {
      router.push('/');
    }
  }, [session, authLoading, supabase, userId, router]);

  const handleLogout = async () => {
    await authLogout();
    toast.success('Logged out successfully'); // NEW: Sonner feedback
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading dashboard...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Enki Dashboard</CardTitle>
          <CardDescription>Access Phase 1 features for waterproofing PM workflows.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Link href="/phase1a">
              <Button className="w-full">Phase 1A: Pre-Bid Protection/Job Setup</Button>
            </Link>
            <Link href="/phase1b">
              <Button className="w-full">Phase 1B: Submittals as Guest</Button>
            </Link>
          </div>

          <Button onClick={handleLogout} variant="destructive" className="mt-4">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}