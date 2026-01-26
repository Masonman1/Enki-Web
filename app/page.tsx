// app/page.tsx (UPDATED: Moved all useState and useEffect hooks to top-level before early return to resolve react-hooks/rules-of-hooks lint errors)
// Note: Hooks now unconditional; early return for authLoading follows after all hook calls

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



export default function Home() {
  const { session, loading: authLoading } = useAuth(); // Top-level hook
  const supabase = useSupabase(); // Top-level hook
  const router = useRouter(); // Top-level hook
  const [email, setEmail] = useState(""); // Moved to top
  const [password, setPassword] = useState(""); // Moved to top
  const [error, setError] = useState<string | null>(null); // Moved to top
  const [loading, setLoading] = useState(false); // Moved to top
  const [isSignUp, setIsSignUp] = useState(false); // Moved to top

  useEffect(() => { // Moved to top (unconditional)
    console.log('Home page rendering—path:', window.location.pathname);
    if (session) {
      router.push('/dashboard');
    }
  }, [session, router]);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  console.log('Rendering login form');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        result = await supabase.auth.signUp({ email, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) {
        setError(result.error.message);
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Unexpected error');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? "Sign Up" : "Sign In"}</CardTitle>
          <CardDescription>{isSignUp ? "Create a new account" : "Enter your credentials"}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
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