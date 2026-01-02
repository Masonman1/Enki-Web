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

  const handleUpload = async (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setError(null);

    try {
      // Check session and role (unchanged)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session - sign in required.");
      const { data: user } = await supabase.auth.getUser();
      if (user.user?.role !== 'authenticated') throw new Error("Role not authenticated.");

      const userId = session.user.id;
      const fileUrls: string[] = [];

      // Upload to Supabase storage and get signed URLs
      for (const file of acceptedFiles) {
        const safeName = file.name.replace(/[\[\]]/g, '').replace(/\s/g, '_');
        const path = `jobs/user_${userId}/phase1a/${safeName}`; // Adjust folder per phase

        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(path, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get signed URL for Grok to access (expires in 1 hour for dev; adjust as needed)
        const { data: signedData, error: signedError } = await supabase.storage
          .from('enki-storage')
          .createSignedUrl(path, 3600); // 1 hour expiry

        if (signedError) throw signedError;

        fileUrls.push(signedData.signedUrl);
      }

      // Parse with Grok via server action (pass URLs and focus)
      const parsedRisks = await parseFiles(fileUrls, { focus: 'setup' }); // Adjust focus per phase, e.g., 'setup' for 1A

      setRisks(parsedRisks);

      // Generate from risks (existing logic)
      const generated = await generateFromRisks(parsedRisks, { type: 'exhibits' }); // Adjust per phase
      setExhibits(generated);

      toast.success('Files uploaded and parsed successfully!');

    } catch (err) {
      setError(err.message);
      toast.error('Upload/parsing failed: ' + err.message);
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