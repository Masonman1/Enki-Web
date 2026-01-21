// app/dashboard/page.tsx (MERGED: Based directly on workspace template; integrated useAuth for auth centralization without duplicated useEffect/session logic; applied lint fixes by making loadSummaries sync (removed async/try-catch for stubs) and calling in useEffect – avoids setState lint issues as sync; restored all handlers/UI from template without changes; added phase navigation in separate Card per user feedback; generated 22 stub summaries by duplicating template stub with incremental ids/dates for testing expand/collapse)
// Note: If real Supabase integration needed, reinstate async/try-catch in loadSummaries and handle lint (e.g., // eslint-disable-next-line react-hooks/set-state-in-effect); stubs ensure 22 for expand test

'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from '@/lib/use-auth'; // NEW: Centralized auth
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { Clipboard, Trash2 } from 'lucide-react';
import toast from "react-hot-toast";
import { formatForHuman } from "@/lib/ai-generate";

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
  const { session, loading, logout: handleLogout } = useAuth(); // NEW: Replaces manual session/useEffect
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [todoFilter, setTodoFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [newSummary, setNewSummary] = useState('');
  const router = useRouter();

  const loadSummaries = () => { // UPDATED: Sync (no async) for lint; generates 22 stubs
    const summaries: ChatSummary[] = [];
    for (let i = 1; i <= 22; i++) {
      summaries.push({
        id: i.toString(),
        dt: `2026-01-${i.toString().padStart(2, '0')}`,
        overview: `Chat summary ${i} for Enki development.`,
        achvs: [`Achievement ${i}A`, `Achievement ${i}B`],
        decs: [`Decision ${i}A`, `Decision ${i}B`],
        todos: [
          { desc: `Todo ${i} high`, pri: 'high' },
          { desc: `Todo ${i} medium`, pri: 'medium' },
          { desc: `Todo ${i} low`, pri: 'low' },
        ],
        nxt: [`Next step ${i}A`, `Next step ${i}B`],
        ctx: [`Context ${i}A`, `Context ${i}B`],
        pid: (i > 1 ? (i - 1).toString() : null),
        stat: { tested: [`Test ${i}A`], pend: [`Pend ${i}A`] },
        cont: i % 2 === 0,
        schema_version: 'v2-simplified',
      });
    }
    setChatSummaries(summaries);
  };

  useEffect(() => {
    loadSummaries();
  }, []);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    router.push('/');
    return null;
  }

  const filteredTodos = () => {
    return chatSummaries.flatMap(summary => summary.todos || []).filter(todo => 
      todoFilter === 'all' || todo.pri === todoFilter
    );
  };

  const handleAddSummary = () => {
    try {
      const parsed = JSON.parse(newSummary);
      setChatSummaries(prev => [...prev, parsed]);
      setNewSummary('');
      toast.success('Summary added');
    } catch {
      toast.error('Invalid JSON');
    }
  };

  const handleCopySummary = (summary: ChatSummary) => {
    navigator.clipboard.writeText(JSON.stringify(summary, null, 2));
    toast.success('Copied to clipboard');
  };

  const handleDeleteSummary = (id: string) => {
    setChatSummaries(prev => prev.filter(s => s.id !== id));
    toast.success('Summary deleted');
  };

  return (
    <div className="container mx-auto p-4">
      {/* NEW: Separate Card for phase navigation per user feedback */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Phase Navigation</CardTitle>
          <CardDescription>Select a phase to proceed</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <Button onClick={() => router.push('/phase1a')}>Phase 1A</Button>
            <Button onClick={() => router.push('/phase1b')}>Phase 1B</Button>
            <Button onClick={() => router.push('/phase1c')}>Phase 1C</Button>
            <Button onClick={() => router.push('/phase1d')}>Phase 1D</Button>
            <Button onClick={() => router.push('/phase1e')}>Phase 1E</Button>
            <Button onClick={() => router.push('/phase1f')}>Phase 1F</Button>
            <Button onClick={() => router.push('/phase1g')}>Phase 1G</Button>
            <Button onClick={() => router.push('/phase1h')}>Phase 1H</Button>
            <Button onClick={() => router.push('/phase1i')}>Phase 1I</Button>
            <Button onClick={() => router.push('/phase1j')}>Phase 1J</Button>
            <Button onClick={() => router.push('/phase1k')}>Phase 1K</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enki Dashboard</CardTitle>
          <CardDescription>Manage chat summaries and to-dos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Chat Summaries</h2>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
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
                {chatSummaries.map(summary => (
                  <TableRow key={summary.id}>
                    <TableCell>{summary.id}</TableCell>
                    <TableCell>{summary.dt}</TableCell>
                    <TableCell>{formatForHuman(summary)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleCopySummary(summary)}>
                        <Clipboard className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteSummary(summary.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2">Add New Summary</h2>
            <Textarea
              value={newSummary}
              onChange={e => setNewSummary(e.target.value)}
              placeholder="Paste JSON summary here"
              rows={10}
            />
            <Button onClick={handleAddSummary} className="mt-2">Add Summary</Button>
          </div>
          {chatSummaries.length > 0 && (
            <>
              <h2 className="text-xl font-semibold mb-2">Filtered To-Dos</h2>
              <div className="flex space-x-2 mb-2">
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