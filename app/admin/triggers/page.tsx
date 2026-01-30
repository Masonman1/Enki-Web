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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useTriggers } from '@/lib/use-triggers';
import { useStandards } from '@/lib/use-standards';
import toast from 'react-hot-toast';

function snakeToTitle(snake: string) {
  return snake.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function TriggersAdmin() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();

  // All hook calls moved to top (before any early returns)
  const { triggers, loading: triggersLoading, insertTrigger, updateTrigger, deleteTrigger } = useTriggers();
  const { standards, loading: standardsLoading, insertStandard, updateStandard, deleteStandard, fetchStandards } = useStandards();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [triggerRewrite, setTriggerRewrite] = useState('');
  const [clauseRewrite, setClauseRewrite] = useState('');
  const [suggestedName, setSuggestedName] = useState('');

  const defaultFormData = {
    title: '',
    csi_code: '',
    keywords: '',
    category: '',
    threshold: '',
    exclusions: '',
    receipt_conditions: '',
    details: '',
    selected_standards: [] as string[],
  };

  const [formData, setFormData] = useState(defaultFormData);

  const [stdForm, setStdForm] = useState({
    id: '',
    standard_name: '',
    description: '',
    category: '',
    applicable_to: '',
  });
  const [isEditingStd, setIsEditingStd] = useState(false);
  const [editingStdId, setEditingStdId] = useState<string | null>(null);

  const [openSection, setOpenSection] = useState<string | null>(null);

  // Effects also at top
  useEffect(() => {
    if (authLoading || !session) {
      if (!authLoading) router.push('/');
      return;
    }
  }, [authLoading, session, router]);

  // Early return now after all hooks
  if (authLoading || triggersLoading || standardsLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleStdChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setStdForm({ ...stdForm, [e.target.name]: e.target.value });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = {
        ...formData,
        selected_standards: formData.selected_standards,
      };
      const res = await fetch('/api/ai-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('AI rewrite failed');
      const { trigger_rewrite, clause_rewrite, suggested_name } = await res.json();
      setTriggerRewrite(trigger_rewrite);
      setClauseRewrite(clause_rewrite);
      setSuggestedName(suggested_name);
      toast.success('Rewrite generated');
    } catch (err) {
      toast.error('Generate failed');
      console.error(err);
    }
  };

  const handleCommit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestedName || !clauseRewrite) return toast.error('Generate first');
    const triggerData = {
      trigger_name: suggestedName,
      description: formData.details,
      patterns: { ...formData },
      clause_template: clauseRewrite,
    };
    try {
      if (editingId) {
        await updateTrigger(editingId, triggerData);
        setEditingId(null);
      } else {
        await insertTrigger(triggerData);
      }
      handleClear();
      toast.success('Trigger committed!');
    } catch (err) {
      toast.error('Commit failed');
      console.error(err);
    }
  };

  const handleEdit = (trigger: any) => {
    console.log('Editing trigger patterns:', trigger.patterns); // DEBUG: Check console for data
    setEditingId(trigger.id);
    setFormData({
      ...defaultFormData,
      ...(trigger.patterns || {}),
    }); // FIXED: Deep merge with defaults (handles partial/missing data)
    setTriggerRewrite('');
    setClauseRewrite(trigger.clause_template || '');
    setSuggestedName(trigger.trigger_name || '');
    // Auto-open manage-triggers-clauses if not open
    if (openSection !== 'manage-triggers-clauses') toggleSection('manage-triggers-clauses');
  };

  const handleDelete = async (id: string) => {
    await deleteTrigger(id);
  };

  const handleClear = () => {
    setTriggerRewrite('');
    setClauseRewrite('');
    setSuggestedName('');
    setFormData(defaultFormData);
    setEditingId(null);
  };

  const handleAddOrUpdateStd = (e: React.FormEvent) => {
    e.preventDefault();
    const applicable_to = stdForm.applicable_to.split(',').map(t => t.trim()).filter(Boolean);
    const updates = {
      standard_name: stdForm.standard_name,
      description: stdForm.description,
      category: stdForm.category,
      applicable_to,
    };

    if (editingStdId) {
      updateStandard(editingStdId, updates);
    } else {
      // NEW: Explicitly add created_by from session for ownership/RLS
      const newStandard = {
        ...updates,
        created_by: session?.user?.id || '', // Fallback empty if guest/dev, but auth required for admin
      };
      insertStandard(newStandard);
    }
    handleClearStd();
  };

  const handleEditStd = (std: any) => {
    setEditingStdId(std.id);
    setStdForm({
      id: std.id,
      standard_name: std.standard_name,
      description: std.description,
      category: std.category,
      applicable_to: std.applicable_to.join(', '),
    });
    setIsEditingStd(true);
  };

  const handleDeleteStd = async (id: string) => {
    await deleteStandard(id);
  };

  // NEW: Clear function for standards form
  const handleClearStd = () => {
    setStdForm({ id: '', standard_name: '', description: '', category: '', applicable_to: '' });
    setIsEditingStd(false);
    setEditingStdId(null);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Sidebar with Toggle Buttons */}
      <div className="w-64 bg-muted p-4 border-r flex flex-col space-y-2">
        <h1 className="text-xl font-bold mb-4">Admin Navigation</h1>
        <Button variant={openSection === 'manage-triggers-clauses' ? 'default' : 'outline'} onClick={() => toggleSection('manage-triggers-clauses')}>
          Manage Triggers and Clauses
        </Button>
        <Button variant={openSection === 'existing-triggers' ? 'default' : 'outline'} onClick={() => toggleSection('existing-triggers')}>
          Existing Risk Triggers
        </Button>
        <Button variant={openSection === 'manage-standards' ? 'default' : 'outline'} onClick={() => toggleSection('manage-standards')}>
          Manage Waterproofing Standards
        </Button>
      </div>

      {/* Main Content Area - Starts Blank */}
      <div className="flex-1 p-4 container mx-auto">
        {!openSection && (
          <div className="text-center mt-20 text-muted-foreground">
            Select a section from the left to begin.
          </div>
        )}

        {/* Manage Triggers and Clauses */}
        {openSection === 'manage-triggers-clauses' && (
          <form onSubmit={handleCommit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trigger Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label>Title</Label>
                <Input name="title" value={formData.title} onChange={handleFormChange} />

                <Label>CSI Code</Label>
                <Input name="csi_code" value={formData.csi_code} onChange={handleFormChange} />

                <Label>Keywords (comma-separated)</Label>
                <Input name="keywords" value={formData.keywords} onChange={handleFormChange} />

                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prep-exclusion">Prep-Exclusion</SelectItem>
                    <SelectItem value="sequencing">Sequencing</SelectItem>
                  </SelectContent>
                </Select>

                <Label>Threshold (e.g., $10K)</Label>
                <Input name="threshold" value={formData.threshold} onChange={handleFormChange} />

                <Label>Exclusions</Label>
                <Textarea name="exclusions" value={formData.exclusions} onChange={handleFormChange} />

                <Label>Receipt Conditions</Label>
                <Textarea name="receipt_conditions" value={formData.receipt_conditions} onChange={handleFormChange} />

                <Label>Details</Label>
                <Textarea name="details" value={formData.details} onChange={handleFormChange} />

                <Label>Applicable Standards</Label>
                <div className="space-y-2">
                  {standards.map((std) => (
                    <div key={std.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={std.id}
                        checked={formData.selected_standards.includes(std.id)}
                        onCheckedChange={() => handleCheckboxChange(std.id)}
                      />
                      <Label htmlFor={std.id}>{std.standard_name} ({std.category})</Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Clause Intent</CardTitle>
              </CardHeader>
              <CardContent>
                <Label>Clause Description</Label>
                <Textarea name="clause_desc" value={formData.clause_desc} onChange={handleFormChange} />
              </CardContent>
            </Card>

            <div className="flex space-x-4">
              <Button type="button" onClick={handleGenerate}>Generate Rewrite</Button>
              <Button type="submit">Commit Trigger</Button>
              <Button variant="outline" type="button" onClick={handleClear}>Clear</Button>
            </div>

            {clauseRewrite && (
              <div className="mt-4 p-4 border rounded">
                <strong>Suggested Name:</strong> {suggestedName}<br />
                <strong>Trigger Rewrite:</strong> {triggerRewrite}<br />
                <strong>Clause Rewrite:</strong> {clauseRewrite}
              </div>
            )}
          </form>
        )}

        {/* Existing Risk Triggers */}
        {openSection === 'existing-triggers' && (
          <div className="space-y-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {triggers.map((trigger) => (
                  <TableRow key={trigger.id}>
                    <TableCell>{trigger.trigger_name}</TableCell>
                    <TableCell>{trigger.description}</TableCell>
                    <TableCell>
                      <Button variant="outline" onClick={() => handleEdit(trigger)}>Edit</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="ml-2">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                            <AlertDialogDescription>Delete this trigger?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(trigger.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Manage Waterproofing Standards */}
        {openSection === 'manage-standards' && (
          <div className="space-y-6">
            <form onSubmit={handleAddOrUpdateStd} className="space-y-4">
              <Label>Standard Name (e.g., ASTM D4541)</Label>
              <Input name="standard_name" value={stdForm.standard_name} onChange={handleStdChange} required />

              <Label>Description</Label>
              <Textarea name="description" value={stdForm.description} onChange={handleStdChange} />

              <Label>Category (e.g., substrates)</Label>
              <Input name="category" value={stdForm.category} onChange={handleStdChange} />

              <Label>Applicable To (comma-separated, e.g., concrete,membranes)</Label>
              <Input name="applicable_to" value={stdForm.applicable_to} onChange={handleStdChange} />

              <div className="flex space-x-4">
                <Button type="submit">{editingStdId ? 'Update' : 'Add'} Standard</Button>
                <Button variant="outline" onClick={handleClearStd}>Clear</Button>
              </div>
            </form>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Applicable To</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {standards.map((std) => (
                  <TableRow key={std.id}>
                    <TableCell>{std.standard_name}</TableCell>
                    <TableCell>{std.description}</TableCell>
                    <TableCell>{std.category}</TableCell>
                    <TableCell>{std.applicable_to.join(', ')}</TableCell>
                    <TableCell>
                      <Button variant="outline" onClick={() => handleEditStd(std)}>Edit</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="ml-2">Delete</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                            <AlertDialogDescription>Delete this standard?</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteStd(std.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}