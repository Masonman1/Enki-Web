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
import { v4 as uuidv4 } from 'uuid';

interface ParsedEssentials {
  contract_number: string | null;
  contract_amount: number | null;
  constructor_name: string | null;
  constructor_address: string | null;
  project_name: string | null;
  project_address: string | null;
  owner_name: string | null;
  owner_address: string | null;
  architect_name: string | null;
  architect_address: string | null;
  scope_of_work: string | null;
  risks: string[];
}

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
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const router = useRouter();
  const supabase = useSupabase();
  const [session, setSession] = useState<any | null>(null);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) router.push('/');
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) router.push('/');
    });

    return () => authListener.subscription.unsubscribe();
  }, [supabase, router]);

  const resetEssentials = () => {
    setContractNumber(null);
    setContractAmount(null);
    setConstructorName(null);
    setConstructorAddress(null);
    setProjectName(null);
    setProjectAddress(null);
    setOwnerName(null);
    setOwnerAddress(null);
    setArchitectName(null);
    setArchitectAddress(null);
    setScopeOfWork(null);
    setRisks([]);
    setToDoItems([]);
    setExhibits([]);
  };

  const handleUpload = async (acceptedFiles: File[]) => {
    resetEssentials();
    setUploading(true);
    setError(null);

    try {
      const fileUrls: string[] = [];

      for (const file of acceptedFiles) {
        const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, ''); // Clean for safety
        const userId = session?.user?.id || 'anon'; // Fallback if null
        const filePath = `user_${userId}/phase/${uuidv4()}/${safeName}`; // Adjusted prefix to match potential policy order
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

      const parsed = await parseFiles(fileUrls);
      if (parsed.length > 0) {
        const { contract_number, contract_amount, constructor_name, constructor_address, project_name, project_address, owner_name, owner_address, architect_name, architect_address, scope_of_work, risks: parsedRisks } = parsed[0];
        setContractNumber(contract_number);
        setContractAmount(contract_amount);
        setConstructorName(constructor_name);
        setConstructorAddress(constructor_address);
        setProjectName(project_name);
        setProjectAddress(project_address);
        setOwnerName(owner_name);
        setOwnerAddress(owner_address);
        setArchitectName(architect_name);
        setArchitectAddress(architect_address);
        setScopeOfWork(scope_of_work);
        setRisks(parsedRisks || []);
        const toDoItems = await generateFromRisks(parsedRisks || [], { type: 'notes' });
        const exhibits = await generateFromRisks(parsedRisks || [], { type: 'exhibits' });
        setToDoItems(toDoItems);
        setExhibits(exhibits);
      }
      toast.success('Processing complete');
    } catch (err) {
      const message = err.message || 'Upload/parse error';
      console.error('Full upload/parse error:', err);
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
          <CardTitle>Phase 1A: Contract Essentials Extraction</CardTitle>
          <CardDescription>Upload subcontract PDFs to extract essentials, detect risks, and generate to-dos/exhibits.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadZone onUpload={handleUpload} />
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {(contractNumber || contractAmount || constructorName || constructorAddress || projectName || projectAddress || ownerName || ownerAddress || architectName || architect_address || scopeOfWork) && (
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
                  <TableRow><TableCell>Contract Number</TableCell><TableCell>{contractNumber || 'N/A'}</TableCell></TableRow>
                  <TableRow><TableCell>Contract Amount</TableCell><TableCell>{contractAmount || 'N/A'}</TableCell></TableRow>
                  <TableRow><TableCell>Constructor Name</TableCell><TableCell>{constructorName || 'N/A'}</TableCell></TableRow>
                  <TableRow><TableCell>Constructor Address</TableCell><TableCell>{constructorAddress || 'N/A'}</TableCell></TableRow>
                  <TableRow><TableCell>Project Name</TableCell><TableCell>{projectName || 'N/A'}</TableCell></TableRow>
                  <TableRow><TableCell>Project Address</TableCell><TableCell>{projectAddress || 'N/A'}</TableCell></TableRow>
                  <TableRow><TableCell>Owner Name</TableCell><TableCell>{ownerName || 'N/A'}</TableCell></TableRow>
                  <TableRow><TableCell>Owner Address</TableCell><TableCell>{ownerAddress || 'N/A'}</TableCell></TableRow>
                  <TableRow><TableCell>Architect Name</TableCell><TableCell>{architectName || 'N/A'}</TableCell></TableRow>
                  <TableRow><TableCell>Architect Address</TableCell><TableCell>{architectAddress || 'N/A'}</TableCell></TableRow>
                  <TableRow><TableCell>Scope of Work</TableCell><TableCell>{scopeOfWork || 'N/A'}</TableCell></TableRow>
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
                    <TableHead>Risk Description</TableHead>
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