'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import UploadZone from '@/components/forms/upload-zone';
import { parseFiles } from '@/lib/ai-parse';
import { generateFromRisks } from '@/lib/ai-generate';
import { AlertCircle } from 'lucide-react';
import toast from "react-hot-toast";

export default function SubmittalsLog() {
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [risks, setRisks] = useState<string[]>([]);
  const [generatedNotes, setGeneratedNotes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) router.push('/');
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => authListener.subscription.unsubscribe();
  }, [router, supabase]);

  const handleUpload = async (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setUploading(true);
    setError(null);
    setRisks([]);
    setGeneratedNotes([]);

    try {
      // Upload to storage
      const uploadPromises = acceptedFiles.map(async (file) => {
        const safeName = file.name.replace(/[\[\]]/g, '').replace(/\s/g, '_');
        const userId = session.user.id;
        const path = `submittals/user_${userId}/${safeName}`;
        console.log('Uploading to path:', path);

        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(path, file, {
            upsert: true,
            contentType: file.type,
            metadata: { type: 'submittals', jobId: '7b078984-527a-495f-a738-18a0fa53de35', deleted_at: null }
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }
        console.log('Upload success:', data);
        return data;
      });

      await Promise.all(uploadPromises);
      toast.success('Files uploaded successfully!');

      // Parse risks (focus: 'submittals')
      const parsedRisks = parseFiles(acceptedFiles, { focus: 'submittals' });
      setRisks(parsedRisks);

      // Generate review notes/warranty items
      const notes = await generateFromRisks(parsedRisks, { type: 'notes', context: { jurisdiction: 'CA', materialType: 'membrane' } });
      setGeneratedNotes(notes);

      // Stub: Insert to submittals table and update jobs.submittals JSONB
      const submittals = parsedRisks.map((r, idx) => ({ job_id: '7b078984-527a-495f-a738-18a0fa53de35', risks: r, notes: notes[idx] }));
      console.log('Stub: Adding to submittals table and jobs.submittals:', submittals);
      // Real: await supabase.from('submittals').insert(submittals); then update jobs.submittals

    } catch (err) {
      setError(err.message || 'Process failed.');
      toast.error('Error during submittals handling.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Phase 1E: Submittals Log & Review</CardTitle>
          <CardDescription>Upload submittals for risk parsing and review notes/warranty generation.</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadZone onUpload={handleUpload} />
          {uploading && <p>Uploading and processing...</p>}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {risks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Identified Risks</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((risk, index) => (
                    <TableRow key={index}>
                      <TableCell>{risk}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {generatedNotes.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Generated Review Notes/Warranties</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Note/Clause</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedNotes.map((note, index) => (
                    <TableRow key={index}>
                      <TableCell>{note}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button className="mt-4" onClick={() => alert('Stub: Email submittal review/warranty registration')}>One-Click Email Review</Button>
            </div>
          )}
          <Button className="mt-6" variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}