'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface TriggerFormProps {
  newTrigger: any;
  setNewTrigger: (trigger: any) => void;
  editingTrigger: any | null;
  handleAddTrigger: () => void;
  handleUpdateTrigger: () => void;
  handleCancelEdit: () => void;
}

export default function TriggerForm({
  newTrigger,
  setNewTrigger,
  editingTrigger,
  handleAddTrigger,
  handleUpdateTrigger,
  handleCancelEdit,
}: TriggerFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="trigger_name">Trigger Name</Label>
        <Input
          id="trigger_name"
          value={newTrigger.trigger_name}
          onChange={(e) => setNewTrigger({ ...newTrigger, trigger_name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={newTrigger.description}
          onChange={(e) => setNewTrigger({ ...newTrigger, description: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="patterns">Patterns (JSON)</Label>
        <Textarea
          id="patterns"
          value={JSON.stringify(newTrigger.patterns, null, 2)}
          onChange={(e) => {
            try {
              setNewTrigger({ ...newTrigger, patterns: JSON.parse(e.target.value) });
            } catch {}
          }}
        />
      </div>
      <div>
        <Label htmlFor="clause_template">Clause Template</Label>
        <Textarea
          id="clause_template"
          value={newTrigger.clause_template}
          onChange={(e) => setNewTrigger({ ...newTrigger, clause_template: e.target.value })}
        />
      </div>
      <div className="flex space-x-2">
        <Button onClick={editingTrigger ? handleUpdateTrigger : handleAddTrigger}>
          {editingTrigger ? 'Update' : 'Add'} Trigger
        </Button>
        {editingTrigger && <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>}
      </div>
    </div>
  );
}