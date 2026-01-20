'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import UploadZone from "@/components/forms/upload-zone";
import { parseFiles } from "@/lib/ai-parse";
import { generateFromRisks } from "@/lib/ai-generate";
import { useSupabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { useRouter } from 'next/navigation';
import type { ParsedContract } from '@/lib/ai-actions';
import { type Session } from '@supabase/supabase-js';

export default function Phase1A() {
  const [files, setFiles] = useState<File[]>([]);
  const [contractNumber, setContractNumber] = useState<string | null>(null);
  const [contractAmount, setContractAmount] = useState<number | null>(null);
  const [constructorName, setConstructorName] = useState<string | null>(null);
  const [constructorAddress, setConstructorAddress] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [projectAddress, setProjectAddress] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [architectName, setArchitectName] = useState<string | null>(null);
  const [architectAddress, setArchitectAddress] = useState<string | null>(null);
  const [scopeOfWork, setScopeOfWork] = useState<string | null>(null);
  const [risks, setRisks] = useState<string[]>([]);
  const [toDoItems, setToDoItems] = useState<string[]>([]);
  const [exhibits, setExhibits] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) router.push('/');
    };
    getSession();
  }, [supabase, router]);

  const handleUpload = async (acceptedFiles: File[]) => {
    if (!session?.user?.id) {
      setError('Authentication required');
      toast.error('Please sign in');
      return;
    }

    setUploading(true);
    setError(null);
    setRisks([]);
    setToDoItems([]);
    setExhibits([]);

    try {
      const fileUrls: string[] = [];

      for (const file of acceptedFiles) {
        const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, ''); // Clean for safety
        const filePath = `jobs/user_${session.user.id}/phase1a/${safeName}`; // Updated path to match Supabase structure
        const { error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(filePath, file, { upsert: true }); // Upsert to avoid duplicate 400s

        if (uploadError) {
          console.error('Upload error details:', uploadError.name, uploadError.message, uploadError.statusCode); // Detailed log
          throw uploadError;
        }

        const { data: signedData, error: signError } = await supabase.storage
          .from('enki-storage')
          .createSignedUrl(filePath, 3600);

        if (signError) {
          console.error('Signed URL error:', signError);
          throw signError;
        }
        if (!signedData?.signedUrl) throw new Error('Failed to generate signed URL');
        fileUrls.push(signedData.signedUrl);
      }

      const parsedResults: ParsedContract[] = await parseFiles(fileUrls);
      console.log('Debug: parsedResults from parseFiles:', parsedResults); // For verification

      const allRisks = parsedResults.flatMap(r => r.risks || []);
      setRisks(allRisks);

      if (parsedResults.length > 0) {
        const essentials = parsedResults[0];
        setContractNumber(essentials.contract_number);
        setContractAmount(essentials.contract_amount);
        setConstructorName(essentials.constructor_name);
        setConstructorAddress(essentials.constructor_address);
        setProjectName(essentials.project_name);
        setProjectAddress(essentials.project_address);
        setOwnerName(essentials.owner_name);
        setOwnerAddress(essentials.owner_address);
        setArchitectName(essentials.architect_name);
        setArchitectAddress(essentials.architect_address);
        setScopeOfWork(essentials.scope_of_work);
      }

      const generatedToDos = await generateFromRisks(allRisks, { type: 'todos' });
      const generatedExhibits = await generateFromRisks(allRisks, { type: 'exhibits' });

      setToDoItems(generatedToDos);
      setExhibits(generatedExhibits);
      toast.success('Processing complete!');

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      console.error('Full upload/parse error:', err); // Catch-all debug
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Phase 1A: Pre-Bid Protection/Job Setup</CardTitle>
          <CardDescription>Upload subcontracts/specs for essentials extraction & risk detection</CardDescription>
        </CardHeader>
        <CardContent>
          <UploadZone onUpload={handleUpload} />
          {files.length > 0 && (
  <div className="mt-4">
    <h4 className="text-sm font-medium">Uploaded Files:</h4>
    <ul className="list-disc pl-5">
      {files.map((file, idx) => (
        <li key={idx} className="text-sm">{file.name}</li>
      ))}
    </ul>
  </div>
)}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {uploading && <p className="mt-4">Uploading and processing...</p>}
          {(contractNumber || contractAmount || constructorName || constructorAddress || projectName || projectAddress || ownerName || ownerAddress || architectName || architectAddress || scopeOfWork) && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Extracted Contract Essentials</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contractNumber && <TableRow><TableCell>Contract Number</TableCell><TableCell>{contractNumber}</TableCell></TableRow>}
                  {contractAmount && <TableRow><TableCell>Contract Amount</TableCell><TableCell>{contractAmount}</TableCell></TableRow>}
                  {constructorName && <TableRow><TableCell>Constructor Name</TableCell><TableCell>{constructorName}</TableCell></TableRow>}
                  {constructorAddress && <TableRow><TableCell>Constructor Address</TableCell><TableCell>{constructorAddress}</TableCell></TableRow>}
                  {projectName && <TableRow><TableCell>Project Name</TableCell><TableCell>{projectName}</TableCell></TableRow>}
                  {projectAddress && <TableRow><TableCell>Project Address</TableCell><TableCell>{projectAddress}</TableCell></TableRow>}
                  {ownerName && <TableRow><TableCell>Owner Name</TableCell><TableCell>{ownerName}</TableCell></TableRow>}
                  {ownerAddress && <TableRow><TableCell>Owner Address</TableCell><TableCell>{ownerAddress}</TableCell></TableRow>}
                  {architectName && <TableRow><TableCell>Architect Name</TableCell><TableCell>{architectName}</TableCell></TableRow>}
                  {architectAddress && <TableRow><TableCell>Architect Address</TableCell><TableCell>{architectAddress}</TableCell></TableRow>}
                  {scopeOfWork && <TableRow><TableCell>Scope of Work</TableCell><TableCell>{scopeOfWork}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          )}
          {risks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Detected Risks</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((risk, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{risk}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {toDoItems.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Generated To-Do Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>To-Do Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {toDoItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{item}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {exhibits.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Generated Exhibits</h3>
              <div className="space-y-2">
                {exhibits.map((exhibit, idx) => (
                  <Alert key={idx}>
                    <AlertDescription>{exhibit}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}
          <Button onClick={() => setFiles([])} variant="outline">Clear Files</Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}