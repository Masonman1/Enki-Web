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

export default function Closeout() {
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [risks, setRisks] = useState<string[]>([]);
  const [generatedPackage, setGeneratedPackage] = useState<string[]>([]);
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
    setGeneratedPackage([]);

    try {
      // Upload to storage
      const uploadPromises = acceptedFiles.map(async (file) => {
        const safeName = file.name.replace(/[\[\]]/g, '').replace(/\s/g, '_');
        const userId = session.user.id;
        const path = `closeouts/user_${userId}/${safeName}`;
        console.log('Uploading to path:', path);

        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(path, file, {
            upsert: true,
            contentType: file.type,
            metadata: { type: 'closeouts', jobId: '7b078984-527a-495f-a738-18a0fa53de35', deleted_at: null }
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

      // Parse risks (focus: 'closeout')
      const parsedRisks = parseFiles(acceptedFiles, { focus: 'closeout' });
      setRisks(parsedRisks);

      // Generate closeout package items (checklists, O&M, warranties)
      const packageItems = await generateFromRisks(parsedRisks, { type: 'packages', context: { warrantyType: 'manufacturer' } });
      setGeneratedPackage(packageItems);

      // Stub: Insert to closeouts JSONB in jobs
      const closeouts = parsedRisks.map((r, idx) => ({ checklist: 'stub', item: packageItems[idx], risk: r }));
      console.log('Stub: Adding to jobs.closeouts:', closeouts);
      // Real: await supabase.from('jobs').update({ closeouts: [...existing, ...closeouts] }).eq('id', '7b078984-527a-495f-a738-18a0fa53de35');

    } catch (err) {
      setError(err.message || 'Process failed.');
      toast.error('Error during closeout handling.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Phase 1K: Closeout Automation</CardTitle>
          <CardDescription>Upload warranties/docs for risk parsing (e.g., incomplete O&M) and package/checklist generation.</CardDescription>
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
          {generatedPackage.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Generated Closeout Package Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item/Clause</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedPackage.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button className="mt-4" onClick={() => alert('Stub: Email closeout package/checklist')}>One-Click Email Closeout Package</Button>
            </div>
          )}
          <Button className="mt-6" variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}