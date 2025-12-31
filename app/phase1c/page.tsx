'use client';

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

export default function ProductDB() {
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [risks, setRisks] = useState<string[]>([]);
  const [generatedMatches, setGeneratedMatches] = useState<string[]>([]);
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
    setGeneratedMatches([]);

    try {
      // Upload PDS PDFs to 'enki-storage/pds/user_{id}/'
      const uploadedFiles = [];
      for (const file of acceptedFiles) {
        const safeName = file.name.replace(/[$$  $$]/g, '').replace(/\s/g, '_');
        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(`pds/user_${session?.user.id}/${safeName}`, file);
        if (uploadError) throw uploadError;
        uploadedFiles.push(safeName);
      }
      console.log('Upload successful:', uploadedFiles);
      toast.success('PDS upload successful!');

      // Stub parse for PDS details (e.g., VOC, lead times, substrates)
      const parsedDetails = parseFiles(acceptedFiles, { focus: 'pds' }); // Custom focus for product data
      console.log('Parsed PDS details:', parsedDetails);
      setRisks(parsedDetails); // Treat as 'details' for matching

      // Stub generate for spec matching/risks (future: Compare to job specs from 1A)
      const matches = await generateFromRisks(parsedDetails, { type: 'matches', context: { jurisdiction: 'CA', materialType: 'membrane' } }); // Mock risks like "Mismatch: VOC exceeds regs"
      console.log('Generated matches/risks:', matches);
      setGeneratedMatches(matches);
      toast.success('Spec matching complete!');
    } catch (err) {
      console.error('Upload/Parse Error details:', err);
      const errorMsg = 'Upload or matching failed: ' + (err as Error).message || "Check RLS or re-login.";
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
          <CardTitle>Phase 1C: Product DB/Spec Matching (Stub)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Upload vendor PDS PDFs (e.g., Tremco membranes) for AI parsing and mock matching against job specs. Focus: Flag risks like VOC limits, lead times, substrate compatibilities for waterproofing profit protection.</p>
          <UploadZone onUpload={handleUpload} />

          {uploading && <p className="mt-4">Uploading and matching...</p>}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {risks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Parsed PDS Details</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((detail, index) => (
                    <TableRow key={index}>
                      <TableCell>{detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {generatedMatches.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Generated Spec Matches/Risks</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match/Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedMatches.map((match, index) => (
                    <TableRow key={index}>
                      <TableCell>{match}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button className="mt-4" onClick={() => alert('Stub: Email spec matching report')}>One-Click Email Report</Button>
            </div>
          )}

          <Button className="mt-6" variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}