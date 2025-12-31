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

export default function SchedulingProgress() {
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [risks, setRisks] = useState<string[]>([]);
  const [generatedLookAheads, setGeneratedLookAheads] = useState<string[]>([]);
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
    setGeneratedLookAheads([]);

    try {
      // Upload to storage
      const uploadPromises = acceptedFiles.map(async (file) => {
        const safeName = file.name.replace(/[\[\]]/g, '').replace(/\s/g, '_');
        const userId = session.user.id;
        const path = `schedules/user_${userId}/${safeName}`;
        console.log('Uploading to path:', path);

        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(path, file, {
            upsert: true,
            contentType: file.type,
            metadata: { type: 'schedules', jobId: '7b078984-527a-495f-a738-18a0fa53de35', deleted_at: null }
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

      // Parse risks (focus: 'scheduling')
      const parsedRisks = parseFiles(acceptedFiles, { focus: 'scheduling' });
      setRisks(parsedRisks);

      // Generate look-aheads/clauses
      const lookAheads = await generateFromRisks(parsedRisks, { type: 'clauses', context: { jurisdiction: 'CA', materialType: 'waterproofing' } });
      setGeneratedLookAheads(lookAheads);

      // Stub: Insert to schedules JSONB in jobs
      const schedules = parsedRisks.map((r, idx) => ({ baseline: 'stub', look_ahead: lookAheads[idx], risk: r }));
      console.log('Stub: Adding to jobs.schedules:', schedules);
      // Real: await supabase.from('jobs').update({ schedules: [...existing, ...schedules] }).eq('id', '7b078984-527a-495f-a738-18a0fa53de35');

    } catch (err) {
      setError(err.message || 'Process failed.');
      toast.error('Error during scheduling handling.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Phase 1F: Scheduling & Progress Tracking</CardTitle>
          <CardDescription>Upload schedules for sequencing risk parsing and look-ahead/clause generation.</CardDescription>
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
              <h3 className="text-lg font-semibold">Identified Sequencing Risks</h3>
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
          {generatedLookAheads.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Generated Look-Aheads/Clauses</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Look-Ahead/Clause</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedLookAheads.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button className="mt-4" onClick={() => alert('Stub: Email scheduling look-ahead/progress diff')}>One-Click Email Look-Ahead</Button>
            </div>
          )}
          <Button className="mt-6" variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}