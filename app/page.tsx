// app/page.tsx (UPDATED: Switched to Sonner for toasts; promise-based feedback for auth)
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/lib/use-auth";
import { useSupabase } from "@/lib/supabase";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner"; // NEW: Sonner for reliable toasts

export default function Home() {
  const { session, loading: authLoading } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();

  const userId = session?.user?.id;

  useEffect(() => {
    if (authLoading || !supabase || !userId) return;

    if (session) {
      router.push('/dashboard');
    }
  }, [session, authLoading, supabase, userId, router]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;
      toast.success(isSignUp ? 'Sign up successful! Logging in...' : 'Sign in successful!');
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Auth failed';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>{isSignUp ? "Sign Up" : "Sign In"}</CardTitle>
          <CardDescription>Access Enki for waterproofing PM tools.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button variant="link" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? "Already have an account? Sign in" : "No account? Sign up"}
            </Button>
          </div>
          <div className="mt-6 space-y-2">
            <Link href="/phase1b">
              <Button variant="outline" className="w-full">Begin Submittals as Guest</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline" className="w-full">Go to Dashboard (Authenticated)</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}