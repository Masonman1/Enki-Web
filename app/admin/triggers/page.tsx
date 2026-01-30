// app/admin/triggers/page.tsx
'use client';  // Client Component (hooks/effects)

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/use-auth';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';  // FIXED: Added missing Button import
import { useTriggers } from '@/lib/use-triggers';
import { useStandards } from '@/lib/use-standards';
import TriggerForm from '@/components/admin/TriggerForm';
import StandardForm from '@/components/admin/StandardForm';
import TriggerTable from '@/components/admin/TriggerTable';
import StandardTable from '@/components/admin/StandardTable';

export default function TriggersAdmin() {
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  const { triggers, loading: triggersLoading, insertTrigger, updateTrigger, deleteTrigger, fetchTriggers } = useTriggers();
  const { standards, loading: standardsLoading, insertStandard, updateStandard, deleteStandard, fetchStandards } = useStandards();

  const [newTrigger, setNewTrigger] = useState({ trigger_name: '', description: '', patterns: {}, clause_template: '' });
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [newStd, setNewStd] = useState({ standard_name: '', description: '', category: '', applicable_to: [] });
  const [editingStd, setEditingStd] = useState(null);
  const [showStandardsForm, setShowStandardsForm] = useState(false);

  useEffect(() => {
    console.log('TriggersAdmin mount: authLoading?', authLoading, 'session?', !!session);  // DEBUG
    if (authLoading) return;
    if (!session) {
      console.log('TriggersAdmin: No session - redirecting to /');  // DEBUG
      router.push('/');
      return;
    }
    fetchTriggers();
    fetchStandards();
  }, [authLoading, session, router, fetchTriggers, fetchStandards]);

  const handleAddTrigger = async () => {
    await insertTrigger(newTrigger);
    setNewTrigger({ trigger_name: '', description: '', patterns: {}, clause_template: '' });
  };

  const handleUpdateTrigger = async () => {
    await updateTrigger(editingTrigger.id, newTrigger);
    setEditingTrigger(null);
    setNewTrigger({ trigger_name: '', description: '', patterns: {}, clause_template: '' });
  };

  const handleEditTrigger = (trigger) => {
    setNewTrigger(trigger);
    setEditingTrigger(trigger);
  };

  const handleCancelEdit = () => {
    setEditingTrigger(null);
    setNewTrigger({ trigger_name: '', description: '', patterns: {}, clause_template: '' });
  };

  const handleDeleteTrigger = async (id) => {
    await deleteTrigger(id);
  };

  const handleAddStd = async () => {
    await insertStandard(newStd);
    setNewStd({ standard_name: '', description: '', category: '', applicable_to: [] });
  };

  const handleUpdateStd = async () => {
    await updateStandard(editingStd.id, newStd);
    setEditingStd(null);
    setNewStd({ standard_name: '', description: '', category: '', applicable_to: [] });
  };

  const handleEditStd = (std) => {
    setNewStd(std);
    setEditingStd(std);
  };

  const handleCancelEditStd = () => {
    setEditingStd(null);
    setNewStd({ standard_name: '', description: '', category: '', applicable_to: [] });
  };

  const handleDeleteStd = async (id) => {
    await deleteStandard(id);
  };

  if (authLoading || triggersLoading || standardsLoading) {
    console.log('TriggersAdmin: Still loading auth/data...');  // DEBUG
    return <div>Loading admin...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Triggers & Standards Admin</CardTitle>
          <CardDescription>Manage risk triggers and waterproofing standards.</CardDescription>
        </CardHeader>
        <CardContent>
          <TriggerForm
            newTrigger={newTrigger}
            setNewTrigger={setNewTrigger}
            editingTrigger={editingTrigger}
            handleAddTrigger={handleAddTrigger}
            handleUpdateTrigger={handleUpdateTrigger}
            handleCancelEdit={handleCancelEdit}
          />
          <div className="mt-6">
            <h3 className="text-lg font-semibold">Existing Triggers</h3>
            <TriggerTable
              triggers={triggers}
              handleEditTrigger={handleEditTrigger}
              handleDeleteTrigger={handleDeleteTrigger}
            />
          </div>
          <Accordion type="single" collapsible className="mt-6">
            <AccordionItem value="standards">
              <AccordionTrigger>Manage Standards</AccordionTrigger>
              <AccordionContent>
                {showStandardsForm ? (
                  <StandardForm
                    newStd={newStd}
                    setNewStd={setNewStd}
                    editingStd={editingStd}
                    handleAddStd={handleAddStd}
                    handleUpdateStd={handleUpdateStd}
                    handleCancelEditStd={handleCancelEditStd}
                  />
                ) : (
                  <Button onClick={() => setShowStandardsForm(true)}>Add New Standard</Button>  // Button usage here
                )}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold">Existing Standards</h3>
                  <StandardTable
                    standards={standards}
                    handleEditStd={handleEditStd}
                    handleDeleteStd={handleDeleteStd}
                  />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}