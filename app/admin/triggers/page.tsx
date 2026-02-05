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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react'; // NEW: Import for spinner
import { useTriggers } from '@/lib/use-triggers';
import { useStandards } from '@/lib/use-standards';
import toast from 'react-hot-toast';

export default function TriggersAdmin() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  // All hook calls moved to top (before any early returns)
  const { triggers, loading: triggersLoading, insertTrigger, updateTrigger, deleteTrigger } = useTriggers();
  const { standards, loading: standardsLoading, insertStandard, updateStandard, deleteStandard } = useStandards();  // Removed fetchStandards
  const [editingId, setEditingId] = useState<string | null>(null);
  const [clauseRewrite, setClauseRewrite] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [suggestedDescription, setSuggestedDescription] = useState(''); // NEW: State for AI-generated description
  const defaultFormData = {
    title: '',
    csi_code: '',
    keywords: '',
    category: '',
    threshold: '',
    exclusions: '',
    receipt_conditions: '',
    details: '',
    clause_title: '',  // NEW: Added for PDF field
    trigger_threshold: '',  // NEW: Added for PDF field (replaces/aliases threshold)
    protections_exclusions: '',  // NEW: Added for PDF field (replaces/aliases exclusions)
    selected_standards: [],  // RESTORED: Array for checkboxes, per original
    is_general_conditions: false,  // NEW: Added for PDF checkbox
    additional_details: '',  // NEW: Added for PDF field (replaces/aliases details)
  };
  const [formData, setFormData] = useState(defaultFormData);
  const [stdForm, setStdForm] = useState({
    id: '',
    standard_name: '',
    description: '',
    category: '',
    applicable_to: '',
  });
  const [editingStdId, setEditingStdId] = useState<string | null>(null);  // Removed isEditingStd
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false); // NEW: State for visual indicator
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
  const handleCheckboxChange = (id: string, checked: boolean) => {  // RESTORED: Handler for standards checkboxes (with ID param)
    setFormData((prev) => ({
      ...prev,
      selected_standards: checked
        ? [...prev.selected_standards, id]
        : prev.selected_standards.filter((s) => s !== id),
    }));
  };
  const handleGeneralConditionsChange = (checked: boolean) => {  // NEW: Separate handler for is_general_conditions (no ID)
    setFormData((prev) => ({
      ...prev,
      is_general_conditions: checked,
    }));
  };
  const handleGenerate = async () => {  // Removed e.preventDefault() since no form
    setGenerating(true); // NEW: Set loading true
    try {
      const body = {
        ...formData,
        // Map to PDF fields for API
        clause_title: formData.clause_title,
        category: formData.category,
        trigger_threshold: formData.trigger_threshold || formData.threshold,  // Alias fallback
        protections_exclusions: formData.protections_exclusions || formData.exclusions,  // Alias fallback
        receipt_conditions: formData.receipt_conditions,
        standards_to_consider: formData.selected_standards.join(', '),  // RESTORED: Join array for API
        is_general_conditions: formData.is_general_conditions,
        additional_details: formData.additional_details || formData.details,  // Alias fallback
      };
      const res = await fetch('/api/ai-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('AI rewrite failed');
      const { clause_rewrite, suggested_name, suggested_description } = await res.json();  // NEW: Include suggested_description
      setClauseRewrite(clause_rewrite);
      setSuggestedName(suggested_name);
      setSuggestedDescription(suggested_description); // NEW: Set state
      toast.success('Rewrite generated');
    } catch (err) {
      toast.error('Generate failed');
      console.error(err);
    } finally {
      setGenerating(false); // NEW: Reset loading
    }
  };
const handleCommit = async () => {
  if (!suggestedName && !formData.title) return toast.error('Provide a name');
  const triggerData = {
    trigger_name: formData.title || suggestedName,
    description: suggestedDescription || formData.details, // NEW: Use AI summary or fallback to details
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
  interface Trigger {  // NEW: Type for handleEdit param
    id: string;
    trigger_name: string;
    description: string;
    patterns: Record<string, unknown>;
    clause_template: string;
  }
const handleEdit = (trigger: Trigger) => {
  console.log('Editing trigger patterns:', trigger.patterns); // DEBUG: Verify patterns jsonb
  setEditingId(trigger.id);
  const patterns = trigger.patterns || {}; // Fallback empty object
  setFormData({
    ...defaultFormData,
    title: patterns.title || trigger.trigger_name || '', // Fallback to trigger_name if missing
    csi_code: patterns.csi_code || '',
    keywords: patterns.keywords || '',
    category: patterns.category || '',
    threshold: patterns.threshold || '',
    exclusions: patterns.exclusions || '',
    receipt_conditions: patterns.receipt_conditions || '',
    details: patterns.details || trigger.description || '', // Fallback to description
    clause_title: patterns.clause_title || '',  // NEW
    trigger_threshold: patterns.trigger_threshold || patterns.threshold || '',  // NEW with alias
    protections_exclusions: patterns.protections_exclusions || patterns.exclusions || '',  // NEW with alias
    selected_standards: patterns.selected_standards || [],  // RESTORED: Array for checkboxes
    is_general_conditions: patterns.is_general_conditions ?? false,  // NEW
    additional_details: patterns.additional_details || patterns.details || '',  // NEW with alias
  });
  setTriggerRewrite('');
  setClauseRewrite(trigger.clause_template || '');
  setSuggestedName(trigger.trigger_name || '');
  setSuggestedDescription(trigger.description || ''); // NEW: Load existing description
  if (openSection !== 'manage-triggers-clauses') toggleSection('manage-triggers-clauses');
};
  const handleDelete = async (id: string) => {
    await deleteTrigger(id);
  };
  const handleClear = () => {
    setTriggerRewrite('');
    setClauseRewrite('');
    setSuggestedName('');
    setSuggestedDescription(''); // NEW: Clear description
    setFormData(defaultFormData);
    setEditingId(null);
  };
  const handleAddOrUpdateStd = async () => {  // Removed e.preventDefault() since no form
    const applicable_to = stdForm.applicable_to.split(',').map(t => t.trim()).filter(Boolean);
    const updates = {
      standard_name: stdForm.standard_name,
      description: stdForm.description,
      category: stdForm.category,
      applicable_to,
    };
    try {
      if (editingStdId) {
        await updateStandard(editingStdId, updates);
      } else {
        // NEW: Explicitly add created_by from session for ownership/RLS
        const newStandard = {
          ...updates,
          created_by: session?.user?.id || '', // Fallback empty if guest/dev, but auth required for admin
        };
        await insertStandard(newStandard);
      }
      handleClearStd();
      toast.success('Standard saved!');
    } catch (err) {
      toast.error('Save failed');
      console.error(err);
    }
  };
  interface Standard {  // NEW: Type for handleEditStd param
    id: string;
    standard_name: string;
    description: string;
    category: string;
    applicable_to: string[];
  }
  const handleEditStd = (std: Standard) => {
    setEditingStdId(std.id);
    setStdForm({
      id: std.id,
      standard_name: std.standard_name,
      description: std.description,
      category: std.category,
      applicable_to: std.applicable_to.join(', '),
    });
  };
  const handleDeleteStd = async (id: string) => {
    await deleteStandard(id);
  };
  // NEW: Clear function for standards form
  const handleClearStd = () => {
    setStdForm({ id: '', standard_name: '', description: '', category: '', applicable_to: '' });
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
      <div className="flex-1 p-4 container mx-auto flex"> {/* UPDATED: Add flex for side-by-side */}
        <div className="flex-1"> {/* UPDATED: Main content flex-1 (with left = fixed w-64, this makes left + main ~60% assuming screen width) */}
          {!openSection && (
            <div className="text-center mt-20 text-muted-foreground">
              Select a section from the left to begin.
            </div>
          )}
          {/* Manage Triggers and Clauses */}
          {openSection === 'manage-triggers-clauses' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Define Trigger Patterns</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label>Title</Label>
                  <Input name="title" value={formData.title} onChange={handleFormChange} />
                  <Label>CSI Code</Label>
                  <Input name="csi_code" value={formData.csi_code} onChange={handleFormChange} />
                  <Label>Keywords (comma-separated)</Label>
                  <Input name="keywords" value={formData.keywords} onChange={handleFormChange} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Clause Prompt Inputs</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label>Clause Title</Label>  {/* NEW: Inserted for PDF field */}
                  <Input name="clause_title" value={formData.clause_title} onChange={handleFormChange} />  {/* NEW: Inserted for PDF field */}
                  <div className="flex items-center space-x-2">  {/* NEW: Inserted wrapper for checkbox */}
                    <Checkbox
                      id="is_general_conditions"
                      checked={formData.is_general_conditions}
                      onCheckedChange={handleGeneralConditionsChange}
                    />
                    <Label htmlFor="is_general_conditions">Is General Conditions?</Label>
                  </div>  {/* NEW: Inserted checkbox for PDF field */}
                  <Label>Clause Category</Label>  {/* UPDATED: Renamed label to match PDF */}
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prep-exclusion">Prep Exclusion</SelectItem>  {/* UPDATED: Options to match PDF */}
                      <SelectItem value="price-escalation-tariff">Price Escalation / Tariff</SelectItem>  {/* NEW: Inserted option */}
                      <SelectItem value="delay-or-site-condition">Delay or Site Condition</SelectItem>  {/* NEW: Inserted option */}
                      <SelectItem value="indemnity-limitation">Indemnity Limitation</SelectItem>  {/* NEW: Inserted option */}
                      <SelectItem value="general-other">General / Other</SelectItem>  {/* NEW: Inserted option */}
                    </SelectContent>
                  </Select>
                  <Label>Trigger / Threshold</Label>  {/* UPDATED: Renamed label to match PDF */}
                  <Input name="trigger_threshold" value={formData.trigger_threshold} onChange={handleFormChange} />  {/* UPDATED: Name to match PDF (aliases threshold) */}
                  <Label>Protections and Exclusions</Label>  {/* UPDATED: Renamed label to match PDF */}
                  <Textarea name="protections_exclusions" value={formData.protections_exclusions} onChange={handleFormChange} />  {/* UPDATED: Name to match PDF (aliases exclusions) */}
                  <Label>Receipt Conditions</Label>
                  <Textarea name="receipt_conditions" value={formData.receipt_conditions} onChange={handleFormChange} />
                  <Label>Additional Details</Label>  {/* UPDATED: Renamed label to match PDF */}
                  <Textarea name="additional_details" value={formData.additional_details} onChange={handleFormChange} />  {/* UPDATED: Name to match PDF (aliases details) */}
                  <Label>Standards to Consider</Label>  {/* RESTORED: Label for checkboxes */}
                  <div className="space-y-2">  {/* RESTORED: Wrapper for checkboxes */}
                    {standards.map((std) => (
                      <div key={std.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`std-${std.id}`}
                          checked={formData.selected_standards.includes(std.id)}
                          onCheckedChange={(checked) => handleCheckboxChange(std.id, checked)}
                        />
                        <Label htmlFor={`std-${std.id}`}>{std.standard_name}</Label>
                      </div>
                    ))}
                  </div>  {/* RESTORED: Mapped checkboxes from standards */}
                </CardContent>
              </Card>
              {clauseRewrite && (
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Clause Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <strong>Suggested Name:</strong> {suggestedName}<br />
                    <strong>Suggested Description:</strong> <br />
                    <Textarea 
                      ref={descriptionRef} // NEW: Attach ref
                      value={suggestedDescription} 
                      readOnly 
                      className="mt-1 resize-none overflow-hidden border-none bg-transparent p-0" // FIXED: No border/padding for seamless; no horizontal scroll
                      onChange={() => {}} // Placeholder
                    /> {/* NEW: Use Textarea for vertical expand */}
                    <strong>Clause Rewrite:</strong> {clauseRewrite}
                  </CardContent>
                </Card>
              )}
              <div className="flex space-x-4">
                <Button type="button" onClick={handleGenerate} disabled={generating}>  {/* NEW: Disable during generating */}
                  {generating ? (
                    <span className="flex items-center">
                      <Loader2 className="animate-spin mr-2 h-4 w-4" /> Generating...
                    </span>
                  ) : (
                    'Generate Rewrite'
                  )}
                </Button>
                <Button type="button" onClick={handleCommit}>Commit Trigger</Button>
                <Button variant="outline" type="button" onClick={handleClear}>Clear</Button>
              </div>
            </div>
          )}
          {/* Existing Risk Triggers */}
          {openSection === 'existing-triggers' && (
            <div className="space-y-6">
              <div className="space-y-4"> {/* NEW: Wrapper for card list */}
                {triggers.map((trigger) => (
                  <Card key={trigger.id}>
                    <CardHeader>
                      <CardTitle>{trigger.trigger_name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap break-words">{trigger.clause_template}</p> {/* NEW: Full clause text with word-wrap */}
                    </CardContent>
                    <CardFooter className="flex space-x-4">
                      <Button variant="outline" onClick={() => handleEdit(trigger)}>Edit</Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive">Delete</Button>
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
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          )}
          {/* Manage Waterproofing Standards */}
          {openSection === 'manage-standards' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Configure Standard</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Label>Standard Name (e.g., ASTM D4541)</Label>
                  <Input name="standard_name" value={stdForm.standard_name} onChange={handleStdChange} />
                  <Label>Description</Label>
                  <Textarea name="description" value={stdForm.description} onChange={handleStdChange} />
                  <Label>Category (e.g., substrates)</Label>
                  <Input name="category" value={stdForm.category} onChange={handleStdChange} />
                  <Label>Applicable To (comma-separated, e.g., concrete,membranes)</Label>
                  <Input name="applicable_to" value={stdForm.applicable_to} onChange={handleStdChange} />
                  <div className="flex space-x-4">
                    <Button type="button" onClick={handleAddOrUpdateStd}>{editingStdId ? 'Update' : 'Add'} Standard</Button>
                    <Button variant="outline" type="button" onClick={handleClearStd}>Clear</Button>
                  </div>
                </CardContent>
              </Card>
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
                  {standards.map((std) => (<TableRow key={std.id}><TableCell>{std.standard_name}</TableCell><TableCell>{std.description}</TableCell><TableCell>{std.category}</TableCell><TableCell>{std.applicable_to.join(', ')}</TableCell><TableCell><Button variant="outline" onClick={() => handleEditStd(std)}>Edit</Button><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" className="ml-2">Delete</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Delete</AlertDialogTitle><AlertDialogDescription>Delete this standard?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteStd(std.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>))} {/* FIXED: Compact JSX to avoid whitespace text nodes in <TableBody> */}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
        {/* NEW: Placeholder right div for future "More Information" */}
        <div className="w-[40%] bg-muted p-4 border-l"> 
          <Card>
            <CardHeader>
              <CardTitle>More Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Help files and additional details will be added here in future updates.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}