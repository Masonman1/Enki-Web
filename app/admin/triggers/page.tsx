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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'; // NEW: For grouping
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'; // NEW: For collapsible standards
import { Switch } from '@/components/ui/switch'; // NEW: For toggle
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'; // NEW: For category dropdown
import { Checkbox } from '@/components/ui/checkbox'; // FIXED: Missing import for checkboxes in table
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

// Mock standards data for appearance (replace with Supabase fetch later)
const mockStandards = [
  { id: '1', code: 'ASTM C920', description: 'Classifies elastomeric joint sealants; covers compatibility, adhesion testing, and substrate prep for proper bonding.' },
  { id: '2', code: 'ACI 504R', description: 'Guides concrete joint design and construction to ensure proper sealant performance and minimize prep rework.' },
  { id: '3', code: 'ICRI CSP 3-4', description: 'Concrete surface profiles for proper cleanliness and texture in prep for coatings and membranes.' },
  { id: '4', code: 'ASTM D5295', description: 'Guide for evaluating concrete surface moisture before applying waterproofing or coatings.' },
  { id: '5', code: 'USITC Section 301', description: 'US International Trade Commission guidelines on tariffs and duties, including trade actions on imports like chemicals/materials.' },
  { id: '6', code: 'SSPC-SP 13', description: 'Surface preparation of concrete for coatings, emphasizing removal of laitance for proper bonding.' },
  // Add more for scroll test
];

function snakeToTitle(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export default function AdminTriggers() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const { triggers, loading: triggersLoading, insertTrigger, updateTrigger, deleteTrigger } = useTriggers();

  const [triggerName, setTriggerName] = useState('');
  const [csiCode, setCsiCode] = useState('');
  const [scopeKeywords, setScopeKeywords] = useState('');
  const [scopeApplicability, setScopeApplicability] = useState(''); // NEW: Scope/Applicability field
  const [isGeneralConditions, setIsGeneralConditions] = useState(true); // NEW: Toggle, default true (scope-specific)
  const [clauseTitle, setClauseTitle] = useState('');
  const [clauseCategory, setClauseCategory] = useState(''); // NEW: Select for category
  const [triggerThreshold, setTriggerThreshold] = useState(''); // NEW: Trigger/Threshold
  const [protectionsExclusions, setProtectionsExclusions] = useState(''); // NEW: Protections/Exclusions
  const [receiptConditions, setReceiptConditions] = useState(''); // NEW: Receipt Conditions
  const [additionalDetails, setAdditionalDetails] = useState(''); // NEW: Additional Details/Remedies
  const [standardsToConsider, setStandardsToConsider] = useState(''); // NEW: Selected standards (comma-separated)
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]); // NEW: For checkbox state
  const [triggerRewrite, setTriggerRewrite] = useState('');
  const [clauseRewrite, setClauseRewrite] = useState('');
  const [suggestedName, setSuggestedName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && !session) {
      router.push('/');
    }
  }, [session, authLoading, router]);

  if (authLoading || triggersLoading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  if (!session) {
    return <div className="flex min-h-screen items-center justify-center">Redirecting...</div>;
  }

  // Stub for generate (focus on appearance, no function)
  const generateRewrites = () => {
    // Placeholder for appearance
  };

  // Stub for submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder
  };

  // Stub for edit
  const handleEdit = (trigger: Trigger) => {
    // Placeholder
  };

  // Stub for delete
  const handleDelete = async (id: string) => {
    // Placeholder
  };

  // Stub for clear
  const handleClear = () => {
    // Placeholder
  };

  // Stub for add selected standards
  const addSelectedStandards = () => {
    setStandardsToConsider(selectedStandards.join(', '));
  };

  // Stub for edit/delete standard (appearance only)
  const editStandard = (id: string) => {
    // Placeholder
  };

  const deleteStandard = (id: string) => {
    // Placeholder
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Admin: Risk Triggers</h1>
      <form onSubmit={handleSubmit} className="space-y-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Trigger Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="csi-code">CSI Code</Label>
              <Input id="csi-code" value={csiCode} onChange={(e) => setCsiCode(e.target.value)} placeholder="e.g., 079200" />
            </div>
            <div>
              <Label htmlFor="scope-keywords">Scope Keywords (one per line)</Label>
              <Textarea id="scope-keywords" value={scopeKeywords} onChange={(e) => setScopeKeywords(e.target.value)} placeholder="e.g.,\nsidewalk joints\nslab isolation joints\ncolumn isolation joints" />
            </div>
            <div>
              <Label htmlFor="scope-applicability">Scope/Applicability</Label>
              <Input id="scope-applicability" value={scopeApplicability} onChange={(e) => setScopeApplicability(e.target.value)} placeholder="e.g., below-grade only or job-wide" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="is-general" checked={isGeneralConditions} onCheckedChange={setIsGeneralConditions} />
              <Label htmlFor="is-general">Scope-Specific Trigger? (Uncheck for general conditions)</Label>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Clause Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clause-title">Clause Title</Label>
              <Input id="clause-title" value={clauseTitle} onChange={(e) => setClauseTitle(e.target.value)} placeholder="e.g., Expansion Joint Preparation" />
            </div>
            <div>
              <Label htmlFor="clause-category">Clause Category</Label>
              <Select value={clauseCategory} onValueChange={setClauseCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price-escalation">Price Escalation/Tariff</SelectItem>
                  <SelectItem value="delay-site-condition">Delay/Site Condition</SelectItem>
                  {/* Add more from PDF examples */}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="trigger-threshold">Trigger/Threshold</Label>
              <Input id="trigger-threshold" value={triggerThreshold} onChange={(e) => setTriggerThreshold(e.target.value)} placeholder="e.g., cost increase >5%" />
            </div>
            <div>
              <Label htmlFor="protections-exclusions">Protections/Exclusions</Label>
              <Textarea id="protections-exclusions" value={protectionsExclusions} onChange={(e) => setProtectionsExclusions(e.target.value)} placeholder="e.g., Not responsible for cutting or grinding joint filler" />
            </div>
            <div>
              <Label htmlFor="receipt-conditions">Receipt Conditions</Label>
              <Textarea id="receipt-conditions" value={receiptConditions} onChange={(e) => setReceiptConditions(e.target.value)} placeholder="e.g., Clean, dry, recessed joints free of contaminants" />
            </div>
            <div>
              <Label htmlFor="additional-details">Additional Details/Remedies</Label>
              <Textarea id="additional-details" value={additionalDetails} onChange={(e) => setAdditionalDetails(e.target.value)} placeholder="e.g., Allow fixes per subcontract if GC requests" />
            </div>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="standards">
                <AccordionTrigger>Select Standards to Prioritize (Optional)</AccordionTrigger>
                <AccordionContent>
                  <div className="overflow-y-auto max-h-[200px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Standard</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mockStandards.map((std) => (
                          <TableRow key={std.id}>
                            <TableCell>
                              <Checkbox 
                                checked={selectedStandards.includes(std.code)}
                                onCheckedChange={(checked) => {
                                  if (checked) setSelectedStandards([...selectedStandards, std.code]);
                                  else setSelectedStandards(selectedStandards.filter((s) => s !== std.code));
                                }}
                              />
                            </TableCell>
                            <TableCell>{std.code}</TableCell>
                            <TableCell className="whitespace-pre-wrap break-words">{std.description}</TableCell>
                            <TableCell className="flex space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => editStandard(std.id)}>Edit</Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteStandard(std.id)}>Delete</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <Button className="mt-4" onClick={addSelectedStandards}>Add Selected</Button>
                  <Input className="mt-2" value={standardsToConsider} readOnly placeholder="Selected standards appear here" />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
        <Button type="button" onClick={generateRewrites} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Rewrites'}
        </Button>
        {triggerRewrite && (
          <div>
            <Label>Trigger Rewrite</Label>
            <pre className="p-2 bg-muted rounded whitespace-pre-wrap break-words overflow-x-auto">{triggerRewrite}</pre>
          </div>
        )}
        {clauseRewrite && (
          <div>
            <Label>Clause Rewrite</Label>
            <pre className="p-2 bg-muted rounded whitespace-pre-wrap break-words overflow-x-auto">{clauseRewrite}</pre>
          </div>
        )}
        <Button type="submit">{editingId ? 'Update' : 'Commit'}</Button>
        <Button type="button" variant="outline" onClick={handleClear}>Clear & Retry</Button>
      </form>
      <div className="overflow-y-auto max-h-[400px]">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
          <TableBody>{triggers.map((t) => <TableRow key={t.id}><TableCell>{snakeToTitle(t.trigger_name)}</TableCell><TableCell><Button variant="ghost" onClick={() => handleEdit(t)}>Edit</Button><AlertDialog><AlertDialogTrigger asChild><Button variant="ghost">Delete</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Delete</AlertDialogTitle><AlertDialogDescription>Delete &apos;{t.trigger_name}&apos;? This is permanent.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(t.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
    </div>
  );
}