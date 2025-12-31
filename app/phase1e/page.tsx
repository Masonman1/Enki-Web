'use client'; // Client component for hooks and interactivity

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import UploadZone from '@/components/forms/upload-zone';
import { parseFiles } from '@/lib/ai-parse';
import { generateFromRisks } from '@/lib/ai-generate';
import { AlertCircle } from 'lucide-react';
import toast from "react-hot-toast";

export default function SubmittalsReview() {
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
      // Standardized bucket: 'enki-storage' with phase sub-paths (e.g., 'jobs/' for setup, 'submittals/' for reviews).
      // RLS enforces user_${id}/ prefix for security—errors indicate auth/policy issues.
      const uploadedFiles = [];
      for (const file of acceptedFiles) {
        const safeName = file.name.replace(/[\[\]]/g, '').replace(/\s/g, '_');
        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(`submittals/user_${session?.user.id}/${safeName}`, file);
        if (uploadError) throw uploadError;
        uploadedFiles.push(safeName);
      }
      console.log('Upload successful:', uploadedFiles); // Debug
      toast.success('Upload successful!');

      const parsedRisks = parseFiles(acceptedFiles, { focus: 'submittals' }); // Custom for warranty/compliance
      console.log('Parsed risks:', parsedRisks); // Debug
      setRisks(parsedRisks);

      const notes = await generateFromRisks(parsedRisks, { type: 'notes', context: { jurisdiction: 'CA', materialType: 'membrane' } });
      console.log('Generated notes:', notes); // Debug
      setGeneratedNotes(notes);
      toast.success('Notes generated!');
    } catch (err) {
      console.error('Upload/Parse Error details:', err); // Enhanced log
      const errorMsg = 'Upload or processing failed: ' + (err as Error).message || "Upload failed - check RLS policies or re-login.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Phase 1E: Submittal Log/Review Hub</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Upload PDFs (vendor submittals, data sheets) for AI review. Focus: Warranty flags, compliance checks, substrate compatibilities for waterproofing (stubbed for Phase 1).</p>
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

          {generatedNotes.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Generated Review Notes</h3>
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
              <Button className="mt-4" onClick={() => alert('Stub: Email submittal review notes')}>One-Click Email Review</Button>
            </div>
          )}

          <Button className="mt-6" variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}