'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Fixed: Added CardDescription
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
  const [parsedProducts, setParsedProducts] = useState<{ manufacturer: string; name: string; voc_level: number; lead_time_avg: number; compatibility: string[] }[]>([]);  // Specific type for product objects
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
        const safeName = file.name.replace(/[\[\]]/g, '').replace(/\s/g, '_');
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

      // Parse with 'pds' focus for structured extractedData (array of objects)
      const extractedProducts = await parseFiles(fileUrls, { focus: 'pds' });
      console.log('Grok Parsed Products:', extractedProducts); // Log raw AI output
      setParsedProducts(extractedProducts);

      // Generate matches/risks/alternates notes from extracted (treat as 'risks' for generation)
      const generated = await generateFromRisks(
        extractedProducts.map(prod => `Product: ${prod.name}, VOC: ${prod.voc_level}, Lead Time: ${prod.lead_time_avg}`), // Convert to risk-like strings
        { type: 'notes', context: { jurisdiction: 'CA', materialType: 'membrane' } } // Waterproofing context for VOC/compatibility
      );
      console.log('Generated Matches:', generated); // Log notes/risks
      setGeneratedMatches(generated);

      // Batch upsert to 'products' table (UUID for id, map fields)
      const productsToInsert = extractedProducts.map(prod => ({
        id: uuidv4(),
        manufacturer: prod.manufacturer,
        name: prod.name,
        voc_level: prod.voc_level,
        lead_time_avg: prod.lead_time_avg,
        compatibilities: prod.compatibility // JSONB array
      }));
      const { error: insertError } = await supabase.from('products').upsert(productsToInsert);
      if (insertError) throw new Error(`DB insert failed: ${insertError.message}`);

      toast.success('Upload, parse, and generation complete! Products saved to DB.');
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
      <Card className="w-[600px]">
        <CardHeader>
          <CardTitle>Product DB/Spec Matching (1C)</CardTitle>
          <CardDescription>Upload PDS PDFs for structured extraction and spec matching/risks generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadZone onUpload={handleUpload} />
          {uploading && <div>Loading... (Uploading and parsing with AI)</div>}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {parsedProducts.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Extracted Products</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>VOC Level</TableHead>
                    <TableHead>Lead Time (weeks)</TableHead>
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