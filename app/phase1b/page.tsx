'use client'; // Client component for hooks and interactivity

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import UploadZone from '@/components/forms/upload-zone';
import { parseFiles } from '@/lib/ai-parse';
import { generateFromRisks } from '@/lib/ai-generate';
import toast from "react-hot-toast";
import { v4 as uuidv4 } from 'uuid'; // Add this import if not present; install via npm install uuid @types/uuid

export default function Phase1B() {
  const [files, setFiles] = useState<File[]>([]);
  const [risks, setRisks] = useState<string[]>([]);
  const [generatedExhibits, setGeneratedExhibits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState(null);
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
    setLoading(true);
    setError(null);
    setRisks([]);
    setGeneratedExhibits([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session - sign in required.");
      const userId = session.user.id;

      const fileUrls: string[] = [];

      for (const file of acceptedFiles) {
        const safeName = file.name.replace(/[\[\]]/g, '').replace(/\s/g, '_');
        const path = `jobs/user_${userId}/phase1b/${safeName}`;

        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(path, file, { upsert: true, contentType: 'application/pdf' });

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: { signedUrl } } = await supabase.storage
          .from('enki-storage')
          .createSignedUrl(path, 3600);
        if (!signedUrl) throw new Error('Failed to get signed URL');
        fileUrls.push(signedUrl);
      }

      const parsedRisks = await parseFiles(fileUrls, { focus: 'setup' });
      setRisks(parsedRisks);

      const generated = await generateFromRisks(parsedRisks, {
        type: 'exhibits',
        context: { jurisdiction: 'CA', materialType: 'membrane' }
      });
      setGeneratedExhibits(generated);

      const jobId = uuidv4(); // Generate new UUID for testing; in production, use existing or query
      const { error: insertError } = await supabase.from('jobs').upsert({
        id: jobId,
        owner_id: userId,
        essentials: { milestones: 'Extracted milestones...', gc_contacts: 'GC details...' }, // Stub; enhance with parsed data
        to_do_items: generated.map(item => ({ description: item, priority: 'high' }))
      });
      if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);

      toast.success('Upload, parse, and generation complete! To-Do items saved to DB.');
    } catch (error) {
      console.error('Error in handleUpload:', error);
      setError(error.message || 'An unexpected error occurred.');
      toast.error('Error: ' + (error.message || 'Check console for details'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Job Setup Wizard (1B)</CardTitle>
          <CardDescription>Upload subcontracts/specs for essentials extraction and To-Do generation for misses.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadZone onUpload={handleUpload} />
          {loading && <div>Loading... (Uploading and parsing with AI)</div>}
          {files.length > 0 && (
            <div>
              <h3 className="font-semibold">Selected Files:</h3>
              <ul className="list-disc pl-5">
                {files.map((file, idx) => <li key={idx}>{file.name}</li>)}
              </ul>
            </div>
          )}
          {risks.length > 0 && (
            <div className="mt-4 space-y-4">
              <h4 className="text-sm font-medium">Detected Risks/Misses:</h4>
              {risks.map((risk, idx) => (
                <Alert key={idx} variant="warning">
                  <AlertDescription>{risk}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          {generatedExhibits.length > 0 && (
            <div className="mt-4 space-y-4">
              <h4 className="text-sm font-medium">Generated Essentials/To-Do Clauses:</h4>
              {generatedExhibits.map((exhibit, idx) => (
                <Alert key={idx} variant="default">
                  <AlertDescription>{exhibit}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <Button onClick={() => handleUpload(files)} disabled={loading || files.length === 0}>
            {loading ? 'Processing...' : 'Extract Essentials & Generate To-Do'}
          </Button>
          <Button className="mt-6" variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}