// app/admin/triggers/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/use-auth';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import toast from 'react-hot-toast';
import { useTriggers } from '@/lib/use-triggers';

interface Trigger {
  id: string;
  trigger_name: string;
  description: string;
  patterns: object;
  clause_template: string;
  created_at: string;
  updated_at: string;
}

export default function AdminTriggers() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const { triggers, loading: triggersLoading, insertTrigger, updateTrigger, deleteTrigger } = useTriggers();
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    trigger_desc: '',
    clause_desc: '',
    trigger_rewrite: '',
    clause_rewrite: '',
    suggested_name: '',
  });

  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/');
    }
  }, [authLoading, session, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateRewrites = async () => {
    const mockTriggerRewrite = `CSI equals 079200 AND scope_item contains '${form.trigger_desc.split(' ').slice(-3).join(' ')}'`;
    const mockClauseRewrite = `Exhibit: The General Contractor shall indemnify and hold harmless the Subcontractor from any and all claims, damages, or delays arising from non-compliance with the specified sequencing dependencies, pursuant to applicable building codes and manufacturer warranties.`;
    const mockName = form.trigger_desc.toLowerCase().replace(/\s+/g, '_').slice(0, 50);

    setForm({
      ...form,
      trigger_rewrite: mockTriggerRewrite,
      clause_rewrite: mockClauseRewrite,
      suggested_name: mockName,
    });
    toast.success('Rewrites generated (mock)—review and commit.');
  };

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const patternsObj = {
        csi: form.trigger_rewrite.match(/CSI equals (\w+)/)?.[1] || '',
        match_type: 'contains',
        keywords: form.trigger_rewrite.split(' ').filter(w => w.length > 3),
      };
      const triggerData = {
        trigger_name: form.suggested_name,
        description: form.trigger_desc,
        patterns: patternsObj,
        clause_template: form.clause_rewrite,
      };

      if (mode === 'add') {
        await insertTrigger(triggerData);
        toast.success('Trigger committed');
      } else if (editingId) {
        await updateTrigger(editingId, triggerData);
        toast.success('Trigger updated');
      }
      handleClear();
    } catch (err) {
      toast.error('Commit failed—check console');
      console.error(err);
    }
  };

  const handleClear = () => {
    setForm({ trigger_desc: '', clause_desc: '', trigger_rewrite: '', clause_rewrite: '', suggested_name: '' });
    setMode('add');
    setEditingId(null);
  };

  const handleEdit = (trigger: Trigger) => {
    setForm({
      trigger_desc: trigger.description,
      clause_desc: trigger.clause_template,
      trigger_rewrite: '',
      clause_rewrite: '',
      suggested_name: trigger.trigger_name,
    });
    setMode('edit');
    setEditingId(trigger.id);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTrigger(id);
      toast.success('Trigger deleted');
    } catch (err) {
      toast.error('Delete failed');
      console.error(err);
    }
  };

  if (authLoading || triggersLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return null; // Redirect handled in effect; null to avoid flash
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin: Manage Risk Triggers</h1>
      <form onSubmit={handleCommit} className="space-y-4 mb-8 border p-4 rounded">
        <div>
          <Label>Trigger Description (Natural Language)</Label>
          <Textarea name="trigger_desc" value={form.trigger_desc} onChange={handleChange} required placeholder="E.g., 'CSI 079200 with sidewalk expansion joints missing backer rod'" />
        </div>
        <div>
          <Label>Clause Description (Natural Language)</Label>
          <Textarea name="clause_desc" value={form.clause_desc} onChange={handleChange} required placeholder="E.g., 'GC installs rod and we're not liable for extras'" />
        </div>
        <Button type="button" onClick={generateRewrites}>Generate Rewrites</Button>
        <div>
          <Label>Trigger Rewrite (Preview)</Label>
          <Textarea value={form.trigger_rewrite} readOnly />
        </div>
        <div>
          <Label>Clause Rewrite (Preview)</Label>
          <Textarea value={form.clause_rewrite} readOnly />
        </div>
        <div>
          <Label>Suggested Name (Editable)</Label>
          <Input name="suggested_name" value={form.suggested_name} onChange={handleChange} required />
        </div>
        <Button type="submit">{mode === 'add' ? 'Commit to DB' : 'Save Changes'}</Button>
        <Button type="button" variant="outline" onClick={handleClear}>Clear & Retry</Button>
      </form>
      <div className="overflow-y-auto max-h-[400px]">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>{triggers.map((t) => <TableRow key={t.id}><TableCell>{t.trigger_name}</TableCell><TableCell><Button variant="ghost" onClick={() => handleEdit(t)}>Edit</Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost">Delete</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Delete</AlertDialogTitle><AlertDialogDescription>Delete &apos;{t.trigger_name}&apos;? This is permanent.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(t.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </div>
  );
}