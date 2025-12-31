'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import UploadZone from '@/components/forms/upload-zone';
import { parseFiles } from '@/lib/ai-parse';
import { generateFromRisks } from '@/lib/ai-generate';
import { AlertCircle } from 'lucide-react';
import toast from "react-hot-toast";

export default function KickoffCompliance() {
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [risks, setRisks] = useState<string[]>([]);
  const [generatedItems, setGeneratedItems] = useState<string[]>([]);
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
    setGeneratedItems([]);

    try {
      // Upload to storage
      const uploadPromises = acceptedFiles.map(async (file) => {
        const safeName = file.name.replace(/[\[\]]/g, '').replace(/\s/g, '_');
        const userId = session.user.id;
        const path = `rfis/user_${userId}/${safeName}`;
        console.log('Uploading to path:', path);

        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(path, file, {
            upsert: true,
            contentType: file.type,
            metadata: { type: 'rfi', jobId: '7b078984-527a-495f-a738-18a0fa53de35', deleted_at: null }
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

      // Parse risks (focus: 'kickoff')
      const parsedRisks = parseFiles(acceptedFiles, { focus: 'kickoff' });
      setRisks(parsedRisks);

      // Generate RFI/SSSP items
      const items = await generateFromRisks(parsedRisks, { type: 'clauses', context: { jurisdiction: 'CA', materialType: 'waterproofing' } });
      setGeneratedItems(items);

      // Stub: Insert to jobs.rfis JSONB
      const rfis = parsedRisks.map((r, idx) => ({ id: `rfi-${idx}`, description: r, generated: items[idx] }));
      console.log('Stub: Adding to jobs.rfis:', rfis);
      // Real: await supabase.from('jobs').update({ rfis: [...existing, ...rfis] }).eq('id', 'stub-job-123');

    } catch (err) {
      setError(err.message || 'Process failed.');
      toast.error('Error during kickoff handling.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Phase 1D: Kickoff & Compliance Automation</CardTitle>
          <CardDescription>Upload site plans/safety docs for RFI/SSSP parsing and generation.</CardDescription>
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
              <h3 className="text-lg font-semibold">Identified Risks/Misses</h3>
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
          {generatedItems.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Generated RFI/SSSP Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item/Clause</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button className="mt-4" onClick={() => alert('Stub: Email RFI/SSSP to GC')}>One-Click Email RFI/SSSP</Button>
            </div>
          )}
          <Button className="mt-6" variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}