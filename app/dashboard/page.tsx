'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea"; // NEW: For append form
import toast from "react-hot-toast"; // For feedback
import React from 'react'; // Added: For React.Fragment

interface ChatSummary {
  chatId: number;
  date: string;
  overview: string;
  keyAchievements: string[];
  decisionsMade: string[];
  openTodos: { description: string; priority: string }[];
  nextSteps: string[];
  contextReminders: string[];
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = useSupabase();
  const [summaries, setSummaries] = useState<ChatSummary[]>([]);
  const [expandedChats, setExpandedChats] = useState<number[]>([]);
  const [todoFilter, setTodoFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [newSummaryJson, setNewSummaryJson] = useState<string>(''); // NEW: For append
  const [showAppendForm, setShowAppendForm] = useState(false); // NEW: Toggle form

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
        setSummaries((data?.summaries || []) as ChatSummary[]);
      } catch (err) {
        setFetchError('Failed to fetch logs: ' + (err as Error).message);
      }
    }
    fetchLogs();
  }, [supabase]);

  const toggleExpand = (chatId: number) => {
    setExpandedChats(prev => prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]);
  };

  const filteredTodos = () => {
    return summaries.flatMap(summary => summary.openTodos).filter(todo => todoFilter === 'all' || todo.priority === todoFilter);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  // NEW: Append handler - Parse JSON, concat, upsert
  const handleAppendSummary = async () => {
    try {
      const newSummary: ChatSummary = JSON.parse(newSummaryJson);
      const updatedSummaries = [...summaries, newSummary];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Auth required');

      const { error } = await supabase.from('dev_logs')
        .upsert({ user_id: user.id, summaries: updatedSummaries }, { onConflict: 'user_id' });

      if (error) throw error;
      setSummaries(updatedSummaries);
      setNewSummaryJson('');
      setShowAppendForm(false);
      toast.success('Summary appended!');
    } catch (err) {
      toast.error('Append failed: ' + (err as Error).message);
    }
  };

  if (fetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Alert variant="destructive"><AlertDescription>{fetchError}</AlertDescription></Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Development Dashboard</CardTitle>
          <CardDescription>Chat summaries, open todos, and phase navigation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* NEW: Phase Navigation Grid */}
          <div className="grid grid-cols-3 gap-4">
            <Button onClick={() => router.push('/phase1a')}>1A: Contract Protection</Button>
            <Button onClick={() => router.push('/phase1b')}>1B: Job Setup</Button>
            <Button onClick={() => router.push('/phase1c')}>1C: Compliance</Button>
            <Button onClick={() => router.push('/phase1d')}>1D: RFIs</Button>
            <Button onClick={() => router.push('/phase1e')}>1E: Submittals Log</Button>
            <Button onClick={() => router.push('/phase1f')}>1F: Scheduling</Button>
            <Button onClick={() => router.push('/phase1g')}>1G: Change Orders</Button>
            <Button onClick={() => router.push('/phase1h')}>1H: Procurement</Button>
            <Button onClick={() => router.push('/phase1i')}>1I: Invoice Review</Button>
            <Button onClick={() => router.push('/phase1j')}>1J: Billing</Button>
            <Button onClick={() => router.push('/phase1k')}>1K: Closeout</Button>
          </div>

          {/* NEW: Append Button/Form */}
          <div>
            <Button onClick={() => setShowAppendForm(!showAppendForm)}>Append New Summary</Button>
            {showAppendForm && (
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Paste new summary JSON here..."
                  value={newSummaryJson}
                  onChange={(e) => setNewSummaryJson(e.target.value)}
                  rows={10}
                />
                <Button onClick={handleAppendSummary}>Submit Append</Button>
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold">Chat Summaries</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Chat ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Overview</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((summary) => (
                  <React.Fragment key={summary.chatId}>
                    <TableRow>
                      <TableCell>{summary.chatId}</TableCell>
                      <TableCell>{summary.date}</TableCell>
                      <TableCell>{summary.overview}</TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="outline" size="sm" onClick={() => toggleExpand(summary.chatId)}>
                          {expandedChats.includes(summary.chatId) ? 'Collapse' : 'Expand'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCopy(JSON.stringify(summary, null, 2))}>
                          Copy Summary
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedChats.includes(summary.chatId) && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium">Key Achievements</h4>
                              <ul className="list-disc pl-5">
                                {summary.keyAchievements.map((ach, idx) => <li key={idx}>{ach}</li>)}
                              </ul>
                            </div>
                            {/* Similar for other sections; braced comments: Expanded details */}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-6">
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
                {filteredTodos().map((todo, idx) => (
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