// app/dashboard/page.tsx (UPDATED: Add index signature to ChatSummary for TS fix; no logic changes)

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/use-auth";
import { useSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Clipboard, Trash2 } from 'lucide-react';
import toast from "react-hot-toast";
import { formatForHuman } from "@/lib/ai-generate"; // For human-readable chat summary display

interface TodoItem {
  desc: string;
  pri: 'high' | 'medium' | 'low';
}

interface ChatSummary {
  id: string;
  dt: string;
  ov?: Record<string, unknown>;
  overview?: string;
  achvs?: string[];
  decs?: string[];
  todos?: TodoItem[];
  nxt?: string[];
  ctx?: string[];
  pid?: string | null;
 [key: string]: unknown;  // Add index signature to allow as Record<string, unknown> for formatForHuman
}

interface Job {
  id: string;
  title: string;
  status: string;
}

export default function Dashboard() {
  const { session, loading: authLoading, logout: handleLogout } = useAuth();
  const supabase = useSupabase();
  const router = useRouter();
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [todoFilter, setTodoFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummaries() {
      if (!supabase || !session) return;
      try {
        const { data, error } = await supabase
          .from('chat_summaries')
          .select('*')
          .eq('user_id', session.user.id)
          .order('dt', { ascending: false });
        if (error) throw error;
        setChatSummaries(data || []);
      } catch (err) {
        setError('Fetch error: ' + (err instanceof Error ? err.message : 'Unknown'));
      } finally {
        setLoading(false);
      }
    }
    fetchSummaries();
  }, [supabase, session]);

  const filteredTodos = () => {
    const allTodos = chatSummaries.flatMap(s => s.todos ?? []);
    return todoFilter === 'all' ? allTodos : allTodos.filter((t): t is TodoItem => t !== undefined && t.pri === todoFilter);
  };

  const handleClipboardCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (authLoading || loading) return <div className="flex min-h-screen items-center justify-center">Loading dashboard...</div>;
  if (!session) return <div className="flex min-h-screen items-center justify-center">Unauthorized - Redirecting...</div>;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Enki Dashboard</CardTitle>
          <CardDescription>Overview of Phase 1 progress, chat summaries, and to-dos for waterproofing PM workflows.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

          {/* Phase 1 Subphases Grid */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Phase 1 Subphases</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Link href="/phase1a">
                <Button className="w-full">Phase 1A: Pre-Bid Protection</Button>
              </Link>
              <Link href="/phase1b">
                <Button className="w-full">Phase 1B: Job Setup/Submittals</Button>
              </Link>
              {/* Phases 1C-1K: Commented out as WIP stubs; recreate lazily using centralized patterns (usePhaseUpload, PHASE_CONFIGS, PhaseLayout) */}
              {/* <Link href="/phase1c"><Button variant="outline" className="w-full">Phase 1C: Specs/Materials (WIP)</Button></Link> */}
              {/* <Link href="/phase1d"><Button variant="outline" className="w-full">Phase 1D: Kickoff/Compliance (WIP)</Button></Link> */}
              {/* <Link href="/phase1e"><Button variant="outline" className="w-full">Phase 1E: Submittals Log (WIP)</Button></Link> */}
              {/* <Link href="/phase1f"><Button variant="outline" className="w-full">Phase 1F: Scheduling/Progress (WIP)</Button></Link> */}
              {/* <Link href="/phase1g"><Button variant="outline" className="w-full">Phase 1G: Change Orders (WIP)</Button></Link> */}
              {/* <Link href="/phase1h"><Button variant="outline" className="w-full">Phase 1H: Procurement (WIP)</Button></Link> */}
              {/* <Link href="/phase1i"><Button variant="outline" className="w-full">Phase 1I: Invoice Review (WIP)</Button></Link> */}
              {/* <Link href="/phase1j"><Button variant="outline" className="w-full">Phase 1J: Billing (WIP)</Button></Link> */}
              {/* <Link href="/phase1k"><Button variant="outline" className="w-full">Phase 1K: Closeout (WIP)</Button></Link> */}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Note: Phases 1C–1K are currently disabled (WIP). Recreate as needed with centralized patterns from 1A/1B.
            </p>
          </div>

          {/* Chat Summaries (Restored Full) */}
          {chatSummaries.length > 0 && (
            <>
              <h3 className="text-lg font-semibold">Chat Summaries</h3>
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
                  {chatSummaries.map((summary) => (
                    <TableRow key={summary.id}>
                      <TableCell>{summary.id}</TableCell>
                      <TableCell>{summary.dt}</TableCell>
                      <TableCell>{formatForHuman(summary)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleClipboardCopy(formatForHuman(summary))}>
                          <Clipboard className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}

          {/* Open To-Dos (Restored Full) */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Open To-Dos</h3>
            <div className="flex space-x-2 mb-4">
              <Button variant={todoFilter === 'all' ? 'default' : 'outline'} onClick={() => setTodoFilter('all')}>All</Button>
              <Button variant={todoFilter === 'high' ? 'default' : 'outline'} onClick={() => setTodoFilter('high')}>High</Button>
              <Button variant={todoFilter === 'medium' ? 'default' : 'outline'} onClick={() => setTodoFilter('medium')}>Medium</Button>
              <Button variant={todoFilter === 'low' ? 'default' : 'outline'} onClick={() => setTodoFilter('low')}>Low</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTodos().map((todo, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{todo.desc}</TableCell>
                    <TableCell>{todo.pri}</TableCell>
                  </TableRow>
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