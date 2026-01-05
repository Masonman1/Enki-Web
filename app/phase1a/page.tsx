'use client';

import { useState } from "react";
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
  const [exhibits, setExhibits] = useState<string[]>([]);
  const [toDoItems, setToDoItems] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setUploading(true);
    setError(null);
    setRisks([]);
    setExhibits([]);
    setToDoItems([]);
    resetEssentials();

    try {
      const uploadPromises = acceptedFiles.map(async (file) => {
        const filePath = `${uuidv4()}/${file.name}`;
        const { error: uploadError } = await supabase.storage.from('enki-storage').upload(filePath, file);
        if (uploadError) throw uploadError;
        return filePath;
      });

      const filePaths = await Promise.all(uploadPromises);

      const signedUrls = await Promise.all(
        filePaths.map(async (path) => {
          const { data: signedUrlData, error: signError } = await supabase.storage
            .from('enki-storage')
            .createSignedUrl(path, 60 * 60);
          if (signError) throw signError;
          return signedUrlData?.signedUrl || '';
        })
      );

      const essentialsResults: ParsedEssentials[] = await parseFiles(signedUrls, { focus: 'essentials' });
      const risksResults: ParsedEssentials[] = await parseFiles(signedUrls, { focus: 'risks' });

      const combinedEssentials = combineEssentials(essentialsResults);
      setEssentials(combinedEssentials);

      const combinedRisks = risksResults.flatMap(result => result.risks || []);
      setRisks(combinedRisks);

      const generatedToDos = await generateFromRisks(combinedRisks, { type: 'to_dos' });
      setToDoItems(generatedToDos);

      const generatedExhibits = await generateFromRisks(combinedRisks, { type: 'exhibits' });
      setExhibits(generatedExhibits);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('jobs').upsert({
          user_id: user.id,
          essentials: combinedEssentials,
          to_do_items: generatedToDos,
        });
      }

      toast.success('Processing complete!');
    } catch (err) {
      setError((err as Error).message);
      toast.error('Error during upload/parse.');
    } finally {
      setUploading(false);
    }
  };

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
  };

  const combineEssentials = (results: ParsedEssentials[]) => {
    // Simple combine: Take first non-null from each field (refine for multi-file in Phase 1 expansions)
    return results.reduce((acc, curr) => ({
      contract_number: acc.contract_number || curr.contract_number,
      contract_amount: acc.contract_amount || curr.contract_amount,
      constructor_name: acc.constructor_name || curr.constructor_name,
      constructor_address: acc.constructor_address || curr.constructor_address,
      project_name: acc.project_name || curr.project_name,
      project_address: acc.project_address || curr.project_address,
      owner_name: acc.owner_name || curr.owner_name,
      owner_address: acc.owner_address || curr.owner_address,
      architect_name: acc.architect_name || curr.architect_name,
      architect_address: acc.architect_address || curr.architect_address,
      scope_of_work: acc.scope_of_work || curr.scope_of_work,
    }), {} as ParsedEssentials);
  };

  const setEssentials = (essentials: ParsedEssentials) => {
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
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Phase 1A: Contract Protection</CardTitle>
          <CardDescription>Upload subcontract/specs for essentials/risks parse and To-Do/exhibits gen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadZone onUpload={handleUpload} />
          {uploading && <p>Processing...</p>}
          {files.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold">Selected Files:</h3>
              <ul className="list-disc pl-5 text-sm">
                {files.map((file, idx) => <li key={idx}>{file.name}</li>)}
              </ul>
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {contractNumber && (
            <Alert>
              <AlertDescription>Contract Number: {contractNumber || 'N/A'}</AlertDescription>
            </Alert>
          )}
          {contractAmount && (
            <Alert>
              <AlertDescription>Contract Amount: {contractAmount.toLocaleString() || 'N/A'}</AlertDescription>
            </Alert>
          )}
          {constructorName && (
            <Alert>
              <AlertDescription>Constructor Name: {constructorName || 'N/A'}</AlertDescription>
            </Alert>
          )}
          {constructorAddress && (
            <Alert>
              <AlertDescription>Constructor Address: {constructorAddress || 'N/A'}</AlertDescription>
            </Alert>
          )}
          {projectName && (
            <Alert>
              <AlertDescription>Project Name: {projectName || 'N/A'}</AlertDescription>
            </Alert>
          )}
          {projectAddress && (
            <Alert>
              <AlertDescription>Project Address: {projectAddress || 'N/A'}</AlertDescription>
            </Alert>
          )}
          {ownerName && (
            <Alert>
              <AlertDescription>Owner Name: {ownerName || 'N/A'}</AlertDescription>
            </Alert>
          )}
          {ownerAddress && (
            <Alert>
              <AlertDescription>Owner Address: {ownerAddress || 'N/A'}</AlertDescription>
            </Alert>
          )}
          {architectName && (
            <Alert>
              <AlertDescription>Architect Name: {architectName || 'N/A'}</AlertDescription>
            </Alert>
          )}
          {architectAddress && (
            <Alert>
              <AlertDescription>Architect Address: {architectAddress || 'N/A'}</AlertDescription>
            </Alert>
          )}
          {scopeOfWork && (
            <Alert>
              <AlertDescription>Scope of Work: {scopeOfWork || 'N/A'}</AlertDescription>
            </Alert>
          )}
          {risks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Identified Risks</h3>
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