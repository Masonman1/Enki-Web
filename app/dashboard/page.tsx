// app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Clipboard, Trash2 } from 'lucide-react';
import toast from "react-hot-toast";
import { formatForHuman } from "@/lib/ai-generate"; // Keep for human-readable display in summaries (manual)

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
  stat?: Record<string, unknown>;
  cont?: boolean;
  schema_version?: string;
  [key: string]: unknown;
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = useSupabase();

  const [summaries, setSummaries] = useState<ChatSummary[]>([]);
  const [expandedChats, setExpandedChats] = useState<string[]>([]);
  const [todoFilter, setTodoFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [newSummaryJson, setNewSummaryJson] = useState<string>('');
  const [showAppendForm, setShowAppendForm] = useState(false);
  const [showSummaries, setShowSummaries] = useState(false);
  const [showTodos, setShowTodos] = useState(false);

  useEffect(() => {
    async function fetchSummaries() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }
      const userId = session.user.id;
      try {
        const { data: summariesData, error } = await supabase
          .from('dev_logs')
          .select('summaries')
          .eq('user_id', userId)
          .single();
        if (error) throw error;
        const existingSummaries: ChatSummary[] = summariesData?.summaries || [];
        setSummaries(existingSummaries);
      } catch (err: unknown) {
        setFetchError('Failed to fetch summaries');
        console.error(err);
      }
    }
    fetchSummaries();
  }, [supabase, router]);

  const toggleExpand = (chatId: string) => {
    setExpandedChats(prev =>
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleDelete = async (chatId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) return;
    const updatedSummaries = summaries.filter(summary => summary.id !== chatId);
    const { error } = await supabase
      .from('dev_logs')
      .upsert({ user_id: userId, summaries: updatedSummaries }, { onConflict: 'user_id' });
    if (error) {
      toast.error('Delete failed');
      console.error(error);
    } else {
      setSummaries(updatedSummaries);
      toast.success('Summary deleted');
    }
  };

  const handleAppend = async () => {
    try {
      const parsedJson: Record<string, unknown> = JSON.parse(newSummaryJson); // Use Record for lint safety
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) throw new Error('No user');
      const { data: existing, error: fetchError } = await supabase
        .from('dev_logs')
        .select('summaries')
        .eq('user_id', userId)
        .single();
      if (fetchError) throw fetchError;
      const updatedSummaries = [...(existing?.summaries || []), parsedJson];
      const { error } = await supabase
        .from('dev_logs')
        .upsert({ user_id: userId, summaries: updatedSummaries }, { onConflict: 'user_id' });
      if (error) throw error;
      setSummaries(updatedSummaries as ChatSummary[]);
      setNewSummaryJson('');
      setShowAppendForm(false);
      toast.success('Summary appended!');
    } catch (err: unknown) {
      toast.error('Append failed');
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const filteredTodos = () => {
    const allTodos = summaries.flatMap(summary =>
      (summary.todos || []).map(todo => ({ desc: todo.desc, pri: todo.pri })) // Adjusted for lint/type safety
    );
    return allTodos.filter(todo => todoFilter === 'all' || todo.pri.toLowerCase() === todoFilter);
  };

  if (fetchError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{fetchError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enki Phase 1 Dashboard</CardTitle>
          <CardDescription>Waterproofing PM Force Multiplier</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={() => router.push('/phase1a')}>Phase 1A: Pre-Bid Protection</Button>
            <Button onClick={() => router.push('/phase1b')}>Phase 1B: Job Setup</Button>
            <Button onClick={() => router.push('/phase1c')}>Phase 1C: Submittals</Button>
            <Button onClick={() => router.push('/phase1d')}>Phase 1D: RFIs</Button>
            <Button onClick={() => router.push('/phase1e')}>Phase 1E: Submittals Log</Button>
            <Button onClick={() => router.push('/phase1f')}>Phase 1F: Scheduling/Progress</Button>
            <Button onClick={() => router.push('/phase1g')}>Phase 1G: Change Orders</Button>
            <Button onClick={() => router.push('/phase1h')}>Phase 1H: Procurement</Button>
            <Button onClick={() => router.push('/phase1i')}>Phase 1I: Invoice Review</Button>
            <Button onClick={() => router.push('/phase1j')}>Phase 1J: Billing</Button>
            <Button onClick={() => router.push('/phase1k')}>Phase 1K: Closeout</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Development Logs</CardTitle>
          <CardDescription>Manage chat summaries and aggregated To-Dos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex space-x-4">
            <Button onClick={() => setShowAppendForm(!showAppendForm)}>
              {showAppendForm ? 'Cancel Append' : 'Append New Summary'}
            </Button>
            <Button onClick={() => setShowSummaries(!showSummaries)}>
              {showSummaries ? 'Hide Summaries' : 'Show Summaries'}
            </Button>
            <Button onClick={() => setShowTodos(!showTodos)}>
              {showTodos ? 'Hide To-Dos' : 'Show To-Dos'}
            </Button>
          </div>
          {showAppendForm && (
            <div className="space-y-2">
              <Textarea
                placeholder="Paste optimized JSON summary here"
                value={newSummaryJson}
                onChange={e => setNewSummaryJson(e.target.value)}
                rows={10}
              />
              <Button onClick={handleAppend}>Append to Logs</Button>
            </div>
          )}
          {showSummaries && (
            <>
              <h2 className="text-xl font-semibold">Chat Summaries</h2>
              {summaries.length === 0 ? (
                <p>No summaries found.</p>
              ) : (
                summaries.map((summary, idx) => {
                  const expanded = expandedChats.includes(summary.id as string);
                  return (
                    <Card key={summary.id as string || idx.toString()} className="mt-4"> {/* Lint-safe key */}
                      <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Chat Summary {idx + 1} (ID: {summary.id as string})</CardTitle>
                        <div className="space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopy(formatForHuman(summary))}
                          >
                            <Clipboard className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(summary.id as string)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => toggleExpand(summary.id as string)}>
                            {expanded ? 'Collapse' : 'Expand'}
                          </Button>
                        </div>
                      </CardHeader>
                      {expanded && (
                        <CardContent>
                          <pre className="whitespace-pre-wrap text-sm">{formatForHuman(summary)}</pre> {/* Human-readable display */}
                        </CardContent>
                      )}
                    </Card>
                  );
                })
              )}
            </>
          )}
          <div>
            <h2 className="text-xl font-semibold">Open To-Dos (Aggregated)</h2>
          </div>
          {showTodos && (
            <>
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
                  {filteredTodos().map((todo, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{todo.desc}</TableCell>
                      <TableCell>{todo.pri}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
          <Button onClick={handleLogout} variant="destructive" className="mt-4">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}