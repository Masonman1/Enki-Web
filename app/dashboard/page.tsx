'use client';

import { useState, useEffect } from 'react'; // For fetch/state
import React from 'react'; // Added: Required for React.Fragment in keyed maps
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert"; // Added for fetchError (if not already)
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function Dashboard() {
  const router = useRouter();
  const supabase = useSupabase();
  const [summaries, setSummaries] = useState<any[]>([]); // Dynamic fetch
  const [expandedChats, setExpandedChats] = useState<number[]>([]);
  const [todoFilter, setTodoFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all'); // For todos
  const [fetchError, setFetchError] = useState<string | null>(null); // For error handling

  useEffect(() => {
    async function fetchLogs() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setFetchError('Auth required - please sign in.');
          return;
        }

        const { data, error } = await supabase.from('dev_logs')
          .select('summaries')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        setSummaries(data?.summaries || []);
      } catch (err) {
        setFetchError('Failed to fetch logs: ' + (err as Error).message);
      }
    }
    fetchLogs();
  }, [supabase]);

  const toggleExpand = (chatId: number) => {
    setExpandedChats((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const filteredTodos = () => {
    return summaries.flatMap((chat: any) =>
      chat.openTodos.filter((todo: any) => todoFilter === 'all' || todo.priority === todoFilter)
    );
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
              <Button onClick={() => router.push('/phase1c')}>Product DB/Spec Matching (1C)</Button>
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
            {fetchError && <Alert variant="destructive"><AlertDescription>{fetchError}</AlertDescription></Alert>}
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
                {summaries.map((chat: any) => (
                  <React.Fragment key={chat.chatId}>
                    <TableRow>
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
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-6"> {/* Open Dev Todos section, if added */}
            <h3 className="text-lg font-semibold">Open Dev Todos</h3>
            <div className="space-x-2 mb-2">
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
                {filteredTodos().map((todo: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{todo.description}</TableCell>
                    <TableCell>{todo.priority}</TableCell>
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