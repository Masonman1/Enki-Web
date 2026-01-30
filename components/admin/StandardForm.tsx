'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface StandardFormProps {
  newStd: any;
  setNewStd: (std: any) => void;
  editingStd: any | null;
  handleAddStd: () => void;
  handleUpdateStd: () => void;
  handleCancelEditStd: () => void;
}

export default function StandardForm({
  newStd,
  setNewStd,
  editingStd,
  handleAddStd,
  handleUpdateStd,
  handleCancelEditStd,
}: StandardFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="standard_name">Standard Name</Label>
        <Input
          id="standard_name"
          value={newStd.standard_name}
          onChange={(e) => setNewStd({ ...newStd, standard_name: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={newStd.description}
          onChange={(e) => setNewStd({ ...newStd, description: e.target.value })}
        />
      </div>
      <div>
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={newStd.category}
          onChange={(e) => setNewStd({ ...newStd, category: e.target.value })}
        />
      </div>
      <div>
        <Label>Applicable To</Label>
        <div className="space-y-2">
          {['substrates', 'materials', 'install_methods'].map((item) => (
            <div key={item} className="flex items-center space-x-2">
              <Checkbox
                id={item}
                checked={newStd.applicable_to.includes(item)}
                onCheckedChange={(checked) => {
                  setNewStd({
                    ...newStd,
                    applicable_to: checked
                      ? [...newStd.applicable_to, item]
                      : newStd.applicable_to.filter((i: string) => i !== item),
                  });
                }}
              />
              <Label htmlFor={item}>{item}</Label>
            </div>
          ))}
        </div>
      </div>
      <div className="flex space-x-2">
        <Button onClick={editingStd ? handleUpdateStd : handleAddStd}>
          {editingStd ? 'Update' : 'Add'} Standard
        </Button>
        {editingStd && <Button variant="outline" onClick={handleCancelEditStd}>Cancel</Button>}
      </div>
    </div>
  );
}