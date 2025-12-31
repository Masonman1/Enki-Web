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
  const [parsedProducts, setParsedProducts] = useState<any[]>([]); // Structured
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
      // Upload to storage
      const uploadPromises = acceptedFiles.map(async (file) => {
        const safeName = file.name.replace(/[\[\]]/g, '').replace(/\s/g, '_');
        const userId = session.user.id;
        const path = `pds/user_${userId}/${safeName}`;
        console.log('Uploading to path:', path);

        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(path, file, {
            upsert: true,
            metadata: { type: 'pds', jobId: 'stub-job-123', deleted_at: null }
          });

        if (uploadError) throw uploadError;
        return data;
      });

      await Promise.all(uploadPromises);
      toast.success('PDS uploaded!');

      // Parse structured details (VOC, compatibility)
      const parsed = parseFiles(acceptedFiles, { focus: 'pds' });
      setParsedProducts(parsed);

      // Stub: Fetch job specs for matching (text search on scope_summary)
      const { data: job } = await supabase.from('jobs').select('scope_summary').eq('id', '7b078984-527a-495f-a738-18a0fa53de35').maybeSingle();
      const specRequirements = job?.data?.scope_summary || 'Stub specs: Low-VOC membrane for concrete substrate';

      // Generate risks/matches (convert structured to risk strings for generate)
      const riskStrings = parsed.map(p => `Risk: VOC ${p.voc_level} vs spec; Compatibility: ${p.compatibility.join(', ')}`);
      const matches = await generateFromRisks(riskStrings, { type: 'notes', context: { materialType: 'membrane' } }); // Alternates as notes
      setGeneratedMatches(matches);

      // Store in DB: Insert to products, update jobs.product_matches
      const { error: productsError } = await supabase.from('products').insert(parsed);
      if (productsError) throw productsError;

      const productIds = parsed.map(p => p.id); // Assume UUID gen in insert
      const { error: jobsError } = await supabase.from('jobs').update({
        product_matches: matches // JSONB array
      }).eq('id', '7b078984-527a-495f-a738-18a0fa53de35');
      if (jobsError) throw jobsError;

    } catch (err) {
      setError(err.message || 'Process failed.');
      toast.error('Error during PDS handling.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Phase 1C: Product DB & Spec Matching</CardTitle>
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
          {parsedProducts.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Parsed PDS Details</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>VOC Level</TableHead>
                    <TableHead>Compatibility</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedProducts.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell>{product.manufacturer}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.voc_level}</TableCell>
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