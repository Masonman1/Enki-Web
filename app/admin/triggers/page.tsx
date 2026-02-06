// app/admin/triggers/page.tsx (REBUILT: Full UI with left/right divs, buttons/tables/forms; Sonner for toasts)
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { useTriggers } from '@/lib/use-triggers';
import { useStandards } from '@/lib/use-standards';
import { toast } from 'sonner'; // Sonner for reliable feedback

interface Trigger {
  id: string;
  trigger_name: string;
  description: string;
  patterns: object;
  clause_template: string;
  created_at: string;
  updated_at: string;
}

interface Standard {
  id: string;
  standard_name: string;
  description: string;
  category: string;
  applicable_to: string[];
  created_at: string;
  updated_at: string;
  created_by: string; // uuid as string for display if needed
}

export default function TriggersAdmin() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const { triggers, loading: triggersLoading, insertTrigger, updateTrigger, deleteTrigger, fetchTriggers } = useTriggers();
  const { standards, loading: standardsLoading, insertStandard, updateStandard, deleteStandard, fetchStandards } = useStandards();
  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null);
  const [triggerForm, setTriggerForm] = useState<Partial<Trigger>>({});
  const [standardForm, setStandardForm] = useState<Partial<Standard>>({ applicable_to: [] });
  const [selectedStd, setSelectedStd] = useState<Standard | null>(null);
  const [isNewTrigger, setIsNewTrigger] = useState(false);
  const [isNewStd, setIsNewStd] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || triggersLoading || standardsLoading) return;
    setLoading(false);
  }, [authLoading, triggersLoading, standardsLoading]);

  const handleTriggerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTriggerForm({ ...triggerForm, [e.target.name]: e.target.value });
  };

  const handleStdChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setStandardForm({ ...standardForm, [e.target.name]: e.target.value });
  };

  const handleStdApplicable = (checked: boolean, value: string) => {
    const applicable_to = checked
      ? [...(standardForm.applicable_to || []), value]
      : (standardForm.applicable_to || []).filter((v) => v !== value);
    setStandardForm({ ...standardForm, applicable_to });
  };

  const handleSaveTrigger = async () => {
    if (isNewTrigger) {
      await insertTrigger(triggerForm as Trigger);
      toast('Trigger inserted');
    } else if (selectedTrigger) {
      await updateTrigger(selectedTrigger.id, triggerForm);
      toast('Trigger updated');
    }
    setSelectedTrigger(null);
    setTriggerForm({});
    setIsNewTrigger(false);
    fetchTriggers();
  };

  const handleDeleteTrigger = async (id: string) => {
    await deleteTrigger(id);
    toast('Trigger deleted');
  };

  const handleSaveStd = async () => {
    if (isNewStd) {
      await insertStandard(standardForm as Standard);
      toast('Standard inserted');
    } else if (selectedStd) {
      await updateStandard(selectedStd.id, standardForm);
      toast('Standard updated');
    }
    setSelectedStd(null);
    setStandardForm({ applicable_to: [] });
    setIsNewStd(false);
    fetchStandards();
  };

  const handleDeleteStd = async (id: string) => {
    await deleteStandard(id);
    toast('Standard deleted');
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /> Loading admin...</div>;
  }

  if (!session) {
    router.push('/');
    return null;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex h-[calc(100vh-80px)]">
        <div className="w-[60%] pr-4 border-r">
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Manage Triggers</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setIsNewTrigger(true)}>Add New Trigger</Button>
                {(isNewTrigger || selectedTrigger) && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="trigger_name">Name</Label>
                      <Input id="trigger_name" name="trigger_name" value={triggerForm.trigger_name || ''} onChange={handleTriggerChange} />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" value={triggerForm.description || ''} onChange={handleTriggerChange} />
                    </div>
                    <div>
                      <Label htmlFor="patterns">Patterns (JSON)</Label>
                      <Textarea id="patterns" name="patterns" value={JSON.stringify(triggerForm.patterns || {}, null, 2) } onChange={handleTriggerChange} />
                    </div>
                    <div>
                      <Label htmlFor="clause_template">Clause Template</Label>
                      <Textarea id="clause_template" name="clause_template" value={triggerForm.clause_template || ''} onChange={handleTriggerChange} />
                    </div>
                    <Button onClick={handleSaveTrigger}>Save</Button>
                    <Button variant="outline" onClick={() => { setSelectedTrigger(null); setIsNewTrigger(false); setTriggerForm({}); }} className="ml-2">Cancel</Button>
                  </div>
                )}
                <div className="mt-4 overflow-auto max-h-[60vh]">
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
                            <Button variant="outline" size="sm" onClick={() => { setSelectedTrigger(trigger); setTriggerForm(trigger); }}>Edit</Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="ml-2">Delete</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                                  <AlertDialogDescription>Delete this trigger?</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTrigger(trigger.id)}>Delete</AlertDialogAction>
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
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Manage Standards</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setIsNewStd(true)}>Add New Standard</Button>
                {(isNewStd || selectedStd) && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="standard_name">Name</Label>
                      <Input id="standard_name" name="standard_name" value={standardForm.standard_name || ''} onChange={handleStdChange} />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" name="description" value={standardForm.description || ''} onChange={handleStdChange} />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input id="category" name="category" value={standardForm.category || ''} onChange={handleStdChange} />
                    </div>
                    <div>
                      <Label>Applicable To</Label>
                      <div className="space-y-2">
                        {['CSI 071000', 'CSI 072600', 'CSI 079200'].map((csi) => (
                          <div key={csi} className="flex items-center space-x-2">
                            <Checkbox id={csi} checked={(standardForm.applicable_to || []).includes(csi)} onCheckedChange={(checked) => handleStdApplicable(!!checked, csi)} />
                            <Label htmlFor={csi}>{csi}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleSaveStd}>Save</Button>
                    <Button variant="outline" onClick={() => { setSelectedStd(null); setIsNewStd(false); setStandardForm({ applicable_to: [] }); }} className="ml-2">Cancel</Button>
                  </div>
                )}
                <div className="mt-4 overflow-auto max-h-[60vh]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {standards.map((std) => (
                        <TableRow key={std.id}>
                          <TableCell>{std.standard_name}</TableCell>
                          <TableCell>{std.category}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedStd(std); setStandardForm(std); }}>Edit</Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="ml-2">Delete</Button>
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
              </CardContent>
            </Card>
          </div>
        </div>
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