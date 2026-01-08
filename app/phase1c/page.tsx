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
import { v4 as uuidv4 } from 'uuid'; // Reuse from Phase 1B

export default function Phase1C() {
  const [session, setSession] = useState(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [parsedProducts, setParsedProducts] = useState<{ manufacturer: string; name: string; voc_level: number; lead_time_avg: number; compatibility: string[] }[]>([]);
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
    setParsedProducts([]);
    setGeneratedMatches([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session - sign in required.");
      const userId = session.user.id;

      const fileUrls: string[] = [];

      for (const file of acceptedFiles) {
        const safeName = file.name.replace(/[\\[\\]]/g, '').replace(/\\s/g, '_');
        const path = `jobs/user_${userId}/phase1c/${safeName}`;

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

      const parsedData = await parseFiles(fileUrls, { focus: 'products' });
      setParsedProducts(parsedData);

      const generated = await generateFromRisks(parsedData.map(p => `Product: ${p.name} - VOC: ${p.voc_level}`), {
        type: 'notes',
        context: { jurisdiction: 'US', materialType: 'waterproofing', leadTime: 4 }
      });
      setGeneratedMatches(generated);

      const jobId = uuidv4(); // Generate new UUID for testing; in production, use existing or query
      const { error: insertError } = await supabase.from('jobs').upsert({
        id: jobId,
        owner_id: userId,
        product_matches: parsedData,
        to_do_items: generated.map(item => ({ description: item, priority: 'medium' }))
      });
      if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);

      toast.success('Upload, parse, and generation complete! Matches saved to DB.');
    } catch (error) {
      console.error('Error in handleUpload:', error);
      setError(error.message || 'An unexpected error occurred.');
      toast.error('Error: ' + (error.message || 'Check console for details'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Material Matching (1C)</CardTitle>
          <CardDescription>Upload product catalogs for spec matches, risks, and alternates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadZone onUpload={handleUpload} />
          {uploading && <div>Uploading and parsing...</div>}
          {files.length > 0 && (
            <div>
              <h3 className="font-semibold">Selected Files:</h3>
              <ul className="list-disc pl-5">
                {files.map((file, idx) => <li key={idx}>{file.name}</li>)}
              </ul>
            </div>
          )}
          {parsedProducts.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Parsed Products</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>VOC Level</TableHead>
                    <TableHead>Avg Lead Time</TableHead>
                    <TableHead>Compatibility</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedProducts.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>{product.manufacturer}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.voc_level}</TableCell>
                      <TableCell>{product.lead_time_avg}</TableCell>
                      <TableCell>{product.compatibility.join(', ')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {generatedMatches.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Generated Spec Matches/Risks/Alternates</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Match/Risk Note</TableHead>
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
              <Button className="mt-4" onClick={() => alert('Stub: Email vendor for quantities/stock; loop until confirmed')}>One-Click Vendor Email Loop</Button>
            </div>
          )}
          <Button className="mt-6" variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}