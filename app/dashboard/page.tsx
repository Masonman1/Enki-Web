'use client';

import { useState } from 'react'; // Added for expansion state
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import chatSummaries from '@/logs/ChatSummaries.json'; // Import for chat summaries
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'; // Added for highlighting
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Dark theme (adjust for light/dark mode)

export default function Dashboard() {
  const router = useRouter();
  const supabase = useSupabase();
  const [expandedChats, setExpandedChats] = useState<number[]>([]); // State for expanded rows

  const toggleExpand = (chatId: number) => {
    setExpandedChats((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: Add toast feedback (reuse from react-hot-toast in workspace)
  };

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
              <Button onClick={() => router.push('/phase1c')}>Product DB/Spec Matching (1C)</Button> {/* Updated: Links to /phase1c for prep */}
              <Button onClick={() => router.push('/phase1d')}>Kickoff/Compliance (1D)</Button>
              <Button onClick={() => router.push('/phase1e')}>Submittals Log/Review (1E)</Button>
              <Button onClick={() => router.push('/phase1f')}>Scheduling/Progress (1F)</Button>
              <Button onClick={() => router.push('/phase1g')}>Change Orders (1G)</Button>
              <Button onClick={() => router.push('/phase1h')}>Procurement (1H)</Button>
              <Button onClick={() => router.push('/phase1i')}>Vendor Invoice Review (1I)</Button>
              <Button onClick={() => router.push('/phase1j')}>Payment Apps & Billing (1J)</Button>
              <Button onClick={() => router.push('/phase1k')}>Closeout Automation (1K)</Button>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Dev Chat Log</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Overview</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chatSummaries.summaries.map((chat) => (
                  <>
                    <TableRow key={chat.chatId}>
                      <TableCell>{chat.chatId}</TableCell>
                      <TableCell>{chat.date}</TableCell>
                      <TableCell>{chat.overview}</TableCell>
                      <TableCell>
                        <Button variant="ghost" onClick={() => toggleExpand(chat.chatId)}>
                          {expandedChats.includes(chat.chatId) ? 'Collapse' : 'Expand'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedChats.includes(chat.chatId) && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <div className="p-4 bg-muted rounded-md">
                            <h4 className="font-medium">Full Summary</h4>
                            <SyntaxHighlighter language="json" style={oneDark}>
                              {JSON.stringify(chat, null, 2)}
                            </SyntaxHighlighter>
                            <Button className="mt-2" onClick={() => handleCopy(JSON.stringify(chat, null, 2))}>
                              Copy Summary
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button onClick={handleLogout} variant="destructive" className="mt-4">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}