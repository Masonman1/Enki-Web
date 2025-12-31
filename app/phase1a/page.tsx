'use client';

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import UploadZone from "@/components/forms/upload-zone";
import { parseFiles } from "@/lib/ai-parse";
import { generateFromRisks } from "@/lib/ai-generate";
import { useSupabase } from "@/lib/supabase";
import toast from "react-hot-toast"; // NEW: For user-facing notifications

export default function Phase1A() {
  const [files, setFiles] = useState<File[]>([]);
  const [risks, setRisks] = useState<string[]>([]);
  const [exhibits, setExhibits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase();

  const handleUpload = async (uploadedFiles: File[]) => {
    setFiles(uploadedFiles);
    setError(null);

    let parsedRisks: string[] = [];
    try {
      // Check session and role
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session - sign in required.");
      const { data: user } = await supabase.auth.getUser();
      console.log('User role:', user.user?.role); // Debug: Role check

      if (user.user?.role !== 'authenticated') throw new Error("Role not authenticated - re-login or check Supabase auth.");

      // Upload with expanded logs
      const uploadPromises = uploadedFiles.map(async (file) => {
        const safeName = file.name.replace(/[\[\]]/g, '').replace(/\s/g, '_');
        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(`jobs/user_${session?.user.id}/${safeName}`, file, { upsert: true });

        if (uploadError) {
          console.error('Upload error for file', file.name, ':', uploadError); // Enhanced log
          throw uploadError;
        }
        console.log('Uploaded file:', data.path); // Debug: Path confirmation
        return data;
      });

      await Promise.all(uploadPromises);
      console.log('All uploads successful'); // Debug
      toast.success('Upload successful!'); // NEW: Success toast for user
    } catch (err: any) {
      console.error("Upload/Parse Error details:", err); // Enhanced log
      const errorMsg = err.message || "Upload failed - check RLS policies (e.g., authenticated role, user path match) or re-login. Stubbing parse.";
      setError(errorMsg);
      toast.error(errorMsg); // NEW: Error toast for user
    } finally {
      parsedRisks = parseFiles(uploadedFiles, { focus: 'setup' });
      console.log('Parsed risks:', parsedRisks); // Debug: Risks output
      setRisks(parsedRisks);
      const generatedExhibits = await generateFromRisks(parsedRisks, { type: 'exhibits', context: { jurisdiction: 'CA' } });
      console.log('Generated exhibits:', generatedExhibits); // Debug: Generated output
      setExhibits(generatedExhibits);
      if (generatedExhibits.length > 0) toast.success('Exhibits generated successfully!'); // NEW: Success toast for generation
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Job Setup Wizard</CardTitle>
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
        </CardContent>
      </Card>
    </div>
  );
}