'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const supabase = useSupabase();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>PM Dashboard</CardTitle>
          <CardDescription>Overview of active jobs, risks, and Phase 1 workflows for waterproofing PM efficiency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p>Stub: Active Jobs - 3 | High Risks - 2 (e.g., substrate mismatches in submittals, lead time delays in procurement)</p>
          <div>
            <h3 className="text-lg font-semibold">Navigate to Phase 1 Workflows</h3>
            <div className="flex flex-col space-y-2 mt-2">
              <Button onClick={() => router.push('/phase1a')}>Contract Protection (1A)</Button>
              <Button onClick={() => router.push('/phase1b')}>New Job Setup Wizard (1B)</Button>
              <Button onClick={() => router.push('/phase1c')}>Product DB/Spec Matching (1C - Stub)</Button> {/* Updated: Links to /phase1c for prep */}
              <Button onClick={() => router.push('/phase1d')}>Kickoff/Compliance (1D)</Button>
              <Button onClick={() => router.push('/phase1e')}>Submittals Log/Review (1E)</Button>
              <Button onClick={() => router.push('/phase1f')}>Scheduling/Progress (1F)</Button>
              <Button onClick={() => router.push('/phase1g')}>Change Orders (1G)</Button>
              <Button onClick={() => router.push('/phase1h')}>Procurement (1H)</Button>
              <Button onClick={() => router.push('/phase1b/invoice')}>Invoice Review (1I)</Button>
              <Button onClick={() => alert('Coming Soon: Payment Apps/Billing (1J)')}>Payment Apps/Billing (1J - Pending)</Button>
              <Button onClick={() => router.push('/phase1b/closeout')}>Closeout (1K)</Button>
              <Button onClick={() => router.push('/phase1b')}>Submittals Wizard (Partial 1B)</Button>
            </div>
          </div>
          <Button onClick={handleLogout} variant="destructive" className="mt-4">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}