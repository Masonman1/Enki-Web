'use client';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface TriggerTableProps {
  triggers: any[];
  handleEditTrigger: (trigger: any) => void;
  handleDeleteTrigger: (id: string) => void;
}

export default function TriggerTable({ triggers, handleEditTrigger, handleDeleteTrigger }: TriggerTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Patterns</TableHead>
          <TableHead>Clause Template</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {triggers.map((trigger) => (
          <TableRow key={trigger.id}>
            <TableCell>{trigger.trigger_name}</TableCell>
            <TableCell>{trigger.description}</TableCell>
            <TableCell>{JSON.stringify(trigger.patterns)}</TableCell>
            <TableCell>{trigger.clause_template}</TableCell>
            <TableCell className="flex space-x-2">
              <Button variant="outline" onClick={() => handleEditTrigger(trigger)}>Edit</Button>
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
                    <AlertDialogAction onClick={() => handleDeleteTrigger(trigger.id)}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}