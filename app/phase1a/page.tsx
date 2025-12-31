'use client';

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UploadZone from "@/components/forms/upload-zone";
import { parseFiles } from "@/lib/ai-parse";
import { generateFromRisks } from "@/lib/ai-generate";
import { useSupabase } from "@/lib/supabase"; // Updated: Use singleton hook for consistency
import toast from "react-hot-toast";
import { useRouter } from 'next/navigation'; // Added: For router.back if needed

export default function Phase1A() {
  const [files, setFiles] = useState<File[]>([]);
  const [risks, setRisks] = useState<string[]>([]);
  const [exhibits, setExhibits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase();
  const router = useRouter(); // Added: For navigation

  const handleUpload = async (uploadedFiles: File[]) => {
    setFiles(uploadedFiles);
    setError(null);

    try {
      // Check session and role (unchanged)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session - sign in required.");
      const { data: user } = await supabase.auth.getUser();
      if (user.user?.role !== 'authenticated') throw new Error("Role not authenticated.");

// Upload with metadata (fit existing policy: start with 'jobs', user_ prefix)
const uploadPromises = uploadedFiles.map(async (file) => {
  const safeName = file.name.replace(/[$$  $$]/g, '').replace(/\s/g, '_');
  const userFolder = `user_${session.user.id}`;  // NEW: Prefix to match policy
  const path = `jobs/${userFolder}/phase1a/${safeName}`;  // NEW: 'jobs' first (allowed), then user_, then phase/file
  const { data, error: uploadError } = await supabase.storage
    .from('enki-storage')
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      metadata: { phase: '1A', type: 'specs', jobId: session.user.id }  // Retained for DB linking
    });
  if (uploadError) throw uploadError;
  return data.path;
});
await Promise.all(uploadPromises);
toast.success('Files uploaded successfully!');

      // Parse with focus (Updated: Explicit 'setup' for pre-bid risks)
      const parsedRisks = parseFiles(uploadedFiles, { focus: 'setup' }); // e.g., "Risk: VOC compliance violation in CA"
      setRisks(parsedRisks);

      // Generate with context (Updated: Jurisdiction for waterproofing regs)
      const generatedExhibits = await generateFromRisks(parsedRisks, { type: 'exhibits', context: { jurisdiction: 'CA' } });
      setExhibits(generatedExhibits);

      // To-Do stub (NEW: Feed high risks to 'jobs.to_do_items' JSONB)
      const highRisks = parsedRisks.filter(risk => risk.includes('high')); // Simple filter; real: Threshold logic
      if (highRisks.length > 0) {
        // Stub insert (real: await supabase.from('jobs').update({ to_do_items: [...] }))
        console.log('Stub: Inserting to jobs.to_do_items:', highRisks.map(r => ({ category: 'pre-bid', importance: 'high', description: r })));
        toast.info('High risks flagged to To-Do items.');
      }
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      toast.error('Upload/processing failed.');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Pre-Award Protection (1A)</CardTitle> {/* Updated: Consistent title */}
          <CardDescription>Upload specs/subcontracts PDFs for risk parsing and exhibit generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadZone onUpload={handleUpload} />
          {files.length > 0 && (
            <div>
              <h3 className="font-semibold">Uploaded Files:</h3>
              <ul className="list-disc pl-5">
                {files.map((file, idx) => (
                  <li key={idx}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
          {risks.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Detected Risks:</h3>
              {risks.map((risk, idx) => (
                <Alert key={idx} variant="warning">
                  <AlertDescription>{risk}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          {exhibits.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Generated Exhibits:</h3>
              {exhibits.map((exhibit, idx) => (
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
          <Button onClick={() => setFiles([])} variant="outline">Clear Files</Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button> {/* Updated: Consistent navigation */}
        </CardContent>
      </Card>
    </div>
  );
}