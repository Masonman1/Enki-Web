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
  const [showSummaries, setShowSummaries] = useState(true);
  const [showTodos, setShowTodos] = useState(true);

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
        if (data && Array.isArray(data.summaries)) {
          const normalized = data.summaries
            .filter((s: unknown) => s && (s as { chatId?: unknown }).chatId != null)
            .map((s: unknown) => ({
              ...(s as ChatSummary),
              chatId: String((s as ChatSummary).chatId),
              parentChatId: (s as ChatSummary).parentChatId ? String((s as ChatSummary).parentChatId) : null,
              date: (s as ChatSummary).date || new Date().toISOString().split('T')[0],
            }));
          setSummaries(normalized);
          console.log('Fetched summaries:', normalized);
        }
      } catch (err: unknown) {
        setFetchError((err as Error).message || 'Failed to fetch logs');
      }
    }
    fetchLogs();
  }, [supabase]);

  const sortedSummaries = () => {
    return [...summaries].sort((a, b) => {
      const safeA = typeof a.chatId === 'string' ? a.chatId : '0';
      const safeB = typeof b.chatId === 'string' ? b.chatId : '0';
      const partsA = safeA.split('.').map(Number);
      const partsB = safeB.split('.').map(Number);
      const maxLen = Math.max(partsA.length, partsB.length);
      for (let i = 0; i < maxLen; i++) {
        const numA = isNaN(partsA[i]) ? 0 : partsA[i];
        const numB = isNaN(partsB[i]) ? 0 : partsB[i];
        if (numA !== numB) return numA - numB;
      }
      return 0;
    });
  };

  const getIndentLevel = (chatId: string) => {
    return typeof chatId === 'string' ? chatId.split('.').length - 1 : 0;
  };

  const getTreePrefix = (level: number) => {
    return '│  '.repeat(Math.max(0, level - 1)) + (level > 0 ? '└─ ' : '');
  };

  const toggleExpand = (chatId: string) => {
    setExpandedChats(prev =>
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const filteredTodos = () => {
    const allTodos = summaries.flatMap(summary => summary.openTodos || []);
    return todoFilter === 'all'
      ? allTodos
      : allTodos.filter(todo => todo.priority.toLowerCase() === todoFilter);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAppend = async () => {
    try {
      const parsed = JSON.parse(newSummaryJson);
      if (!parsed.chatId) throw new Error('Invalid JSON: Must be a valid summary object with chatId');

      const normalizedParsed = {
        ...parsed,
        chatId: String(parsed.chatId),
        parentChatId: parsed.parentChatId ? String(parsed.parentChatId) : null,
        date: parsed.date || new Date().toISOString().split('T')[0],
      };

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Auth required');

      const { data: existing, error: fetchErr } = await supabase.from('dev_logs')
        .select('summaries')
        .eq('user_id', user.id)
        .single();

      if (fetchErr) throw fetchErr;

      const updatedSummaries = [...(existing?.summaries || []), normalizedParsed];

      const { error } = await supabase.from('dev_logs')
        .upsert({ user_id: user.id, summaries: updatedSummaries }, { onConflict: 'user_id' });

      if (error) throw error;

      setSummaries([...summaries, normalizedParsed]);
      setNewSummaryJson('');
      setShowAppendForm(false);
      toast.success('Summary appended successfully');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to append summary');
    }
  };

  const handleCopy = (summary: ChatSummary) => {
    navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
    toast.success('Summary copied to clipboard');
  };

  const handleDelete = async (chatId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Auth required');

      const updatedSummaries = summaries.filter(s => s.chatId !== chatId);

      const { error } = await supabase.from('dev_logs')
        .upsert({ user_id: user.id, summaries: updatedSummaries }, { onConflict: 'user_id' });

      if (error) throw error;

      setSummaries(updatedSummaries);
      toast.success('Summary deleted');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to delete summary');
    }
  };

  if (fetchError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Alert variant="destructive">
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Enki Dev Logs Dashboard</CardTitle>
          <CardDescription>Track chat summaries, achievements, and todos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Button onClick={() => setShowAppendForm(!showAppendForm)}>
              {showAppendForm ? 'Cancel Append' : 'Append New Summary'}
            </Button>
            {showAppendForm && (
              <div className="mt-4 space-y-4">
                <Textarea
                  placeholder='Paste JSON summary here (e.g., { "chatId": "1.1", "overview": "..." })'
                  value={newSummaryJson}
                  onChange={(e) => setNewSummaryJson(e.target.value)}
                  rows={6}
                />
                <Button onClick={handleAppend}>Submit Append</Button>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Chat Summaries</h3>
              <Button variant="ghost" onClick={() => setShowSummaries(!showSummaries)}>
                {showSummaries ? 'Collapse' : 'Expand'}
              </Button>
            </div>
            {showSummaries && (
              <div className="overflow-y-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Chat ID</TableHead><TableHead>Date</TableHead><TableHead>Actions</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSummaries().map((summary) => {
                      const isExpanded = expandedChats.includes(summary.chatId);
                      const level = getIndentLevel(summary.chatId);
                      const prefix = getTreePrefix(level);
                      return (
                        <React.Fragment key={summary.chatId}>
                          <TableRow><TableCell>{prefix}{summary.chatId}</TableCell><TableCell>{summary.date || 'N/A'}</TableCell><TableCell className="flex space-x-2"><Button variant="ghost" onClick={() => toggleExpand(summary.chatId)}>{isExpanded ? 'Collapse' : 'Expand'}</Button><Button variant="ghost" size="icon" onClick={() => handleCopy(summary)}><Clipboard className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => handleDelete(summary.chatId)}><Trash2 className="h-4 w-4" /></Button></TableCell></TableRow>
                          {isExpanded && (
                            <TableRow><TableCell colSpan={3} style={{ paddingLeft: `${(level + 1) * 20}px` }}><div className="space-y-2"><p><strong>Overview:</strong> {summary.overview}</p><div><strong>Key Achievements:</strong><ul className="list-disc pl-5">{summary.keyAchievements.map((item, idx) => (<li key={idx}>{item}</li>))}</ul></div><div><strong>Decisions Made:</strong><ul className="list-disc pl-5">{summary.decisionsMade.map((item, idx) => (<li key={idx}>{item}</li>))}</ul></div><div><strong>Next Steps:</strong><ul className="list-disc pl-5">{summary.nextSteps.map((item, idx) => (<li key={idx}>{item}</li>))}</ul></div><div><strong>Context Reminders:</strong><ul className="list-disc pl-5">{summary.contextReminders.map((item, idx) => (<li key={idx}>{item}</li>))}</ul></div></div></TableCell></TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Open Dev Todos</h3>
              <Button variant="ghost" onClick={() => setShowTodos(!showTodos)}>
                {showTodos ? 'Collapse' : 'Expand'}
              </Button>
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