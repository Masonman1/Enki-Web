'use client'; // Client component for hooks and interactivity

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import UploadZone from '@/components/forms/upload-zone';
import { parseFiles } from '@/lib/ai-parse'; // Stub for risks (scheduling-specific, e.g., overlaps)
import { generateExhibits } from '@/lib/ai-generate'; // Stub for look-aheads/clauses (or use generateSubmittals)
import { AlertCircle } from 'lucide-react';

export default function Scheduling() {
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [risks, setRisks] = useState<string[]>([]);
  const [generatedLookAheads, setGeneratedLookAheads] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

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
      const uploadedFiles = [];
      for (const file of acceptedFiles) {
        const { data, error: uploadError } = await supabase.storage
          .from('submittals')
          .upload(`user_${session?.user.id}/${file.name}`, file);
        if (uploadError) throw uploadError;
        uploadedFiles.push(file.name);
      }
      console.log('DEBUG: Upload successful:', uploadedFiles); // Log for debug

      const parsedRisks = await parseFiles(acceptedFiles); // Mock: 'Risk: Sequencing overlap in substrate prep'
      console.log('DEBUG: Parsed risks:', parsedRisks);
      setRisks(parsedRisks);

      const lookAheads = await generateExhibits(parsedRisks); // Mock: 'Look-Ahead: Adjust for GC delay on drywall'
      console.log('DEBUG: Generated look-aheads:', lookAheads);
      setGeneratedLookAheads(lookAheads);
    } catch (err) {
      console.error('DEBUG: Upload failed:', (err as Error).message);
      setError('Upload or processing failed: ' + (err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Phase 1F: Scheduling Review</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Upload schedules (e.g., Excel/Primavera PDFs) for AI review. Focus: Waterproofing activities mapping, sequencing risks, material staging look-aheads, and progress diffing for delays.</p>
          <UploadZone onUpload={handleUpload} />

          {uploading && <p className="mt-4">Uploading and processing...</p>}

          {error && (
            <Alert variant="destructive" className="mt-4">
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
              <Button className="mt-4" onClick={() => alert('Stub: Email scheduling look-ahead')}>One-Click Email Look-Ahead</Button>
            </div>
          )}

          <Button className="mt-6" variant="outline" onClick={() => router.push('/phase1b')}>Back to Submittals Wizard</Button>
        </CardContent>
      </Card>
    </div>
  );
}