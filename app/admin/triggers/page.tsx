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

  // State for open section (single-toggle)
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  useEffect(() => {
    if (authLoading || !session) {
      if (!authLoading) router.push('/');
      return;
    }
  }, [authLoading, session, router]);

  if (authLoading || triggersLoading || standardsLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

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
      toast.success('Rewrite generated!');
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

  const handleAddOrUpdateStd = async (e: React.FormEvent) => {
    e.preventDefault();
    const applicable_to = stdForm.applicable_to.split(',').map((s) => s.trim()).filter(Boolean);
    const payload = { standard_name: stdForm.standard_name, description: stdForm.description, category: stdForm.category, applicable_to };

    if (editingStdId) {
      await updateStandard(editingStdId, payload);
      setEditingStdId(null);
    } else {
      await insertStandard(payload);
    }
    setStdForm({ id: '', standard_name: '', description: '', category: '', applicable_to: '' });
    setIsEditingStd(false);
    fetchStandards();
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
            Select a section from the left to begin managing risk triggers.
          </div>
        )}

        {/* Manage Triggers and Clauses Parent Card (with A + B + Preview inside) */}
        {openSection === 'manage-triggers-clauses' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Manage Triggers and Clauses</CardTitle>
              <CardDescription>Configure triggers for scope parsing and define clause intent for rewrites.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Inner Card A: Trigger Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>Trigger Configuration</CardTitle>
                  <CardDescription>Define essentials for scope parsing (available during trigger detection).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label>Title</Label>
                  <Input name="title" value={formData.title} onChange={handleFormChange} />

                  <Label>CSI Code</Label>
                  <Input name="csi_code" value={formData.csi_code} onChange={handleFormChange} />

                  <Label>Scope Keywords (comma-separated)</Label>
                  <Textarea name="keywords" value={formData.keywords} onChange={handleFormChange} />
                </CardContent>
              </Card>

              {/* Inner Card B: Clause Intent */}
              <Card>
                <CardHeader>
                  <CardTitle>Clause Intent</CardTitle>
                  <CardDescription>Define details for clause generation (merged with prompt template).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prep-exclusion">Prep Exclusion</SelectItem>
                      <SelectItem value="price-escalation">Price Escalation</SelectItem>
                      <SelectItem value="general-conditions">General Conditions</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Label>Threshold (e.g., min PSI)</Label>
                  <Input name="threshold" value={formData.threshold} onChange={handleFormChange} />

                  <Label>Protections / Exclusions</Label>
                  <Textarea name="exclusions" value={formData.exclusions} onChange={handleFormChange} />

                  <Label>Receipt Conditions</Label>
                  <Textarea name="receipt_conditions" value={formData.receipt_conditions} onChange={handleFormChange} />

                  <Label>Additional Details</Label>
                  <Textarea name="details" value={formData.details} onChange={handleFormChange} />

                  <Label>Select Standards (optional)</Label>
                  {standards.map((std) => (
                    <div key={std.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={std.id}
                        checked={formData.selected_standards.includes(std.id)}
                        onCheckedChange={(checked) => {
                          const updated = checked
                            ? [...formData.selected_standards, std.id]
                            : formData.selected_standards.filter((id) => id !== std.id);
                          setFormData({ ...formData, selected_standards: updated });
                        }}
                      />
                      <label htmlFor={std.id}>{std.standard_name}: {std.description}</label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Generated Rewrite Preview - Always shown if data exists */}
              {clauseRewrite && (
                <div className="mb-6 p-4 border rounded-md bg-muted/50">
                  <h2 className="text-xl font-semibold mb-2">Generated Rewrite Preview</h2>
                  <p><strong>Suggested Name:</strong> {suggestedName}</p>
                  <p><strong>Trigger:</strong> {triggerRewrite}</p>
                  <p><strong>Clause:</strong> {clauseRewrite}</p>
                </div>
              )}

              {/* Buttons at Bottom of Parent Card */}
              <div className="flex space-x-4">
                <Button onClick={handleGenerate}>Generate Rewrite</Button>
                <Button onClick={handleCommit}>{editingId ? 'Update' : 'Commit'}</Button>
                <Button variant="outline" onClick={handleClear}>Clear</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Risk Triggers Card */}
        {openSection === 'existing-triggers' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Existing Risk Triggers</CardTitle>
              <CardDescription>View and manage curated triggers.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-y-auto max-h-[400px]">
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>{triggers.map((t) => <TableRow key={t.id}><TableCell>{snakeToTitle(t.trigger_name)}</TableCell><TableCell><Button variant="ghost" onClick={() => handleEdit(t)}>Edit</Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost">Delete</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Delete</AlertDialogTitle><AlertDialogDescription>Delete '{t.trigger_name}'? This is permanent.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(t.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>)}</TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manage Waterproofing Standards Parent Card (with C + Form inside) */}
        {openSection === 'manage-standards' && (
          <Card>
            <CardHeader>
              <CardTitle>Manage Waterproofing Standards</CardTitle>
              <CardDescription>Curate ASTM/ACI refs for trigger rewrites (e.g., substrate risks).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Inner Card C: Existing Standards */}
              <Card>
                <CardHeader>
                  <CardTitle>Existing Standards</CardTitle>
                  <CardDescription>View and manage curated standards.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-y-auto max-h-[400px]">
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
                            <TableCell className="whitespace-normal break-words">{std.standard_name}</TableCell>
                            <TableCell className="whitespace-normal break-words">{std.description}</TableCell>
                            <TableCell>{std.category}</TableCell>
                            <TableCell>{std.applicable_to.join(', ')}</TableCell>
                            <TableCell>
                              <Button variant="ghost" onClick={() => handleEditStd(std)}>Edit</Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost">Delete</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                                    <AlertDialogDescription>Delete '{std.standard_name}'? This is permanent.</AlertDialogDescription>
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
                </CardContent>
              </Card>

              {/* Add/Update Form */}
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}