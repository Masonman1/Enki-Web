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
import React from 'react';

interface ChatSummary {
  chatId: string;
  date?: string;
  overview: string;
  keyAchievements: string[];
  decisionsMade: string[];
  openTodos: { description: string; priority: string }[];
  nextSteps: string[];
  contextReminders: string[];
  parentChatId?: string | null;
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
    async function fetchLogs() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/');
          return;
        }
        const { data, error } = await supabase
          .from('dev_logs')
          .select('summaries')
          .eq('user_id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;
        setSummaries(data?.summaries || []);
      } catch (err: any) {
        setFetchError(err.message || 'Failed to fetch logs');
      }
    }
    fetchLogs();
  }, [supabase, router]);

  const toggleExpand = (chatId: string) => {
    setExpandedChats(prev =>
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const filteredTodos = () => {
    const allTodos = summaries.flatMap(summary => summary.openTodos || []);
    return todoFilter === 'all' ? allTodos : allTodos.filter(todo => todo.priority === todoFilter);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleAppendSummary = async () => {
    try {
      const newSummary = JSON.parse(newSummaryJson);
      const { data: { session } } = await supabase.auth.getSession();
      const { data: existing, error: fetchError } = await supabase
        .from('dev_logs')
        .select('summaries')
        .eq('user_id', session?.user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      const updatedSummaries = [...(existing?.summaries || []), newSummary];

      const { error } = await supabase
        .from('dev_logs')
        .upsert({
          user_id: session?.user.id,
          summaries: updatedSummaries
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setSummaries(updatedSummaries);
      setNewSummaryJson('');
      setShowAppendForm(false);
      toast.success('Summary appended');
    } catch (err: any) {
      toast.error(err.message || 'Failed to append');
    }
  };

  const handleDeleteSummary = async (chatId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const updatedSummaries = summaries.filter(s => s.chatId !== chatId);

      const { error } = await supabase
        .from('dev_logs')
        .update({ summaries: updatedSummaries })
        .eq('user_id', session?.user.id);

      if (error) throw error;

      setSummaries(updatedSummaries);
      toast.success('Summary deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <div className="p-6 flex flex-row gap-4">
      {/* New Left Navigation Card */}
      <Card className="w-fit">
        <CardHeader>
          <CardTitle>Phases</CardTitle>
          <CardDescription>Navigate to phases</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col">
          <Button variant="outline" className="w-full mb-2 text-left" onClick={() => router.push('/phase1a')}>Phase 1A: Contract Essentials</Button>
          <Button variant="outline" className="w-full mb-2 text-left" onClick={() => router.push('/phase1b')}>Phase 1B: Submittals</Button>
          <Button variant="outline" className="w-full mb-2 text-left" onClick={() => router.push('/phase1c')}>Phase 1C: Product Specs</Button>
          <Button variant="outline" className="w-full mb-2 text-left" onClick={() => router.push('/phase1d')}>Phase 1D: RFIs</Button>
          <Button variant="outline" className="w-full mb-2 text-left" onClick={() => router.push('/phase1e')}>Phase 1E: Submittals Log</Button>
          <Button variant="outline" className="w-full mb-2 text-left" onClick={() => router.push('/phase1f')}>Phase 1F: Scheduling</Button>
          <Button variant="outline" className="w-full mb-2 text-left" onClick={() => router.push('/phase1g')}>Phase 1G: Change Orders</Button>
          <Button variant="outline" className="w-full mb-2 text-left" onClick={() => router.push('/phase1h')}>Phase 1H: Procurement</Button>
          <Button variant="outline" className="w-full mb-2 text-left" onClick={() => router.push('/phase1i')}>Phase 1I: Invoice Review</Button>
          <Button variant="outline" className="w-full mb-2 text-left" onClick={() => router.push('/phase1j')}>Phase 1J: Billing</Button>
          <Button variant="outline" className="w-full mb-2 text-left" onClick={() => router.push('/phase1k')}>Phase 1K: Closeout</Button>
        </CardContent>
      </Card>

      {/* Existing Main Card - Add flex-1 */}
      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Dev Logs Dashboard</CardTitle>
          <CardDescription>View and manage chat summaries and open To-Dos</CardDescription>
          <div className="flex space-x-2">
            <Button onClick={() => setShowAppendForm(!showAppendForm)}>
              {showAppendForm ? 'Cancel' : 'Append Summary'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showAppendForm && (
            <div className="mb-4">
              <Textarea
                value={newSummaryJson}
                onChange={(e) => setNewSummaryJson(e.target.value)}
                placeholder="Paste new summary JSON here"
                rows={10}
              />
              <Button onClick={handleAppendSummary} className="mt-2">Append</Button>
            </div>
          )}
          {fetchError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{fetchError}</AlertDescription>
            </Alert>
          )}
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2 border-b pb-2"> {/* Added border-b for separation */}
              <Button variant="outline" onClick={() => setShowSummaries(!showSummaries)}>
                {showSummaries ? 'Collapse' : 'Expand'}
              </Button>
              <h2 className="text-xl font-semibold">Chat Summaries</h2>
            </div>
            {showSummaries && summaries.map((summary) => (
              <Card key={summary.chatId} className="mb-4">
                <CardHeader className="cursor-pointer" onClick={() => toggleExpand(summary.chatId)}>
                  <CardTitle>Chat {summary.chatId}: {summary.date}</CardTitle>
                </CardHeader>
                {expandedChats.includes(summary.chatId) && (
                  <CardContent>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Overview:</h3>
                      <p>{summary.overview}</p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Key Achievements:</h3>
                      <ul className="list-disc pl-5">
                        {summary.keyAchievements.map((ach, idx) => <li key={idx}>{ach}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Decisions Made:</h3>
                      <ul className="list-disc pl-5">
                        {summary.decisionsMade.map((dec, idx) => <li key={idx}>{dec}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Open To-Dos:</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead>Priority</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.openTodos.map((todo, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{todo.description}</TableCell>
                              <TableCell>{todo.priority}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Next Steps:</h3>
                      <ul className="list-disc pl-5">
                        {summary.nextSteps.map((step, idx) => <li key={idx}>{step}</li>)}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-semibold">Context Reminders:</h3>
                      <ul className="list-disc pl-5">
                        {summary.contextReminders.map((rem, idx) => <li key={idx}>{rem}</li>)}
                      </ul>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button variant="outline" size="icon" onClick={() => handleCopy(JSON.stringify(summary, null, 2))}>
                        <Clipboard className="h-4 w-4" />
                      </Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteSummary(summary.chatId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2 border-b pb-2"> {/* Added border-b for separation */}
              <Button variant="outline" onClick={() => setShowTodos(!showTodos)}>
                {showTodos ? 'Collapse' : 'Expand'}
              </Button>
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
                        <TableCell>{todo.description}</TableCell>
                        <TableCell>{todo.priority}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>
          <Button onClick={handleLogout} variant="destructive" className="mt-4">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}