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
  const [toDoItems, setToDoItems] = useState<string[]>([]); // NEW: State for To-Do (from risks)
  const [error, setError] = useState<string | null>(null);
  const supabase = useSupabase();
  const router = useRouter();

  const handleUpload = async (acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
    setError(null);
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
    setExhibits([]);
    setToDoItems([]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session - sign in required.");
      const userId = session.user.id;

      if (acceptedFiles.length === 0) throw new Error("At least the contract PDF is required.");

      const fileUrls: string[] = [];

      for (const file of acceptedFiles) {
        const safeName = file.name.replace(/[\[\]]/g, '').replace(/\s/g, '_');
        const path = `jobs/user_${userId}/phase1a/${safeName}`;

        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(path, file, { upsert: true, contentType: 'application/pdf' });

        if (uploadError) throw uploadError;

        const { data: { signedUrl } } = await supabase.storage
          .from('enki-storage')
          .createSignedUrl(path, 3600);
        fileUrls.push(signedUrl);
      }

      const parsed = await parseFiles(fileUrls, { focus: 'pre-award-essentials' });
      const combinedParsed = parsed[0] || { contract_number: 'Null', contract_amount: null, constructor_name: 'Null', constructor_address: 'Null', project_name: 'Null', project_address: 'Null', owner_name: 'Null', owner_address: 'Null', architect_name: 'Null', architect_address: 'Null', scope_of_work: 'Null', risks: [] };
      setContractNumber(combinedParsed.contract_number);
      setContractAmount(combinedParsed.contract_amount);
      setConstructorName(combinedParsed.constructor_name);
      setConstructorAddress(combinedParsed.constructor_address);
      setProjectName(combinedParsed.project_name);
      setProjectAddress(combinedParsed.project_address);
      setOwnerName(combinedParsed.owner_name);
      setOwnerAddress(combinedParsed.owner_address);
      setArchitectName(combinedParsed.architect_name);
      setArchitectAddress(combinedParsed.architect_address);
      setScopeOfWork(combinedParsed.scope_of_work);
      setRisks(combinedParsed.risks);

      // NEW: Generate To-Do from risks (simple prefix for PM action)
      const generatedToDo = combinedParsed.risks.map(risk => `Review: ${risk}`);
      setToDoItems(generatedToDo);

      // NEW: Generate exhibits from risks
      const generatedExhibits = await generateFromRisks(combinedParsed.risks, { type: 'exhibits' });
      setExhibits(generatedExhibits);

      // Upsert with new fields (normalized + JSONB for nested, risks/to_do_items)
      const jobId = uuidv4();
      const { error: insertError } = await supabase.from('jobs').upsert({
        id: jobId,
        owner_id: userId,
        contract_number: combinedParsed.contract_number !== 'Null' ? combinedParsed.contract_number : null,
        contract_amount: combinedParsed.contract_amount,
        scope_of_work: combinedParsed.scope_of_work !== 'Null' ? combinedParsed.scope_of_work : null,
        to_do_items: generatedToDo.length > 0 ? generatedToDo : null, // NEW: To-Do from risks as JSONB array
        essentials: { // JSONB for constructor, project, owner, architect
          constructor: {
            name: combinedParsed.constructor_name !== 'Null' ? combinedParsed.constructor_name : null,
            address: combinedParsed.constructor_address !== 'Null' ? combinedParsed.constructor_address : null
          },
          project: {
            name: combinedParsed.project_name !== 'Null' ? combinedParsed.project_name : null,
            address: combinedParsed.project_address !== 'Null' ? combinedParsed.project_address : null
          },
          owner: {
            name: combinedParsed.owner_name !== 'Null' ? combinedParsed.owner_name : null,
            address: combinedParsed.owner_address !== 'Null' ? combinedParsed.owner_address : null
          },
          architect: {
            name: combinedParsed.architect_name !== 'Null' ? combinedParsed.architect_name : null,
            address: combinedParsed.architect_address !== 'Null' ? combinedParsed.architect_address : null
          }
        }
      });
      if (insertError) throw insertError;

      toast.success('Parse complete! Essentials, risks, and To-Do saved to DB.');
    } catch (error) {
      setError(error.message);
      toast.error('Error: ' + error.message);
    }
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Pre-Award Protection (1A)</CardTitle>
          <CardDescription>Upload unexecuted contract (required) + optional specs/proposal for essentials extraction and risk detection.</CardDescription>
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
          {contractNumber !== null && (
            <div className="space-y-2">
              <h3 className="font-semibold">Extracted Subcontract Number:</h3>
              <Alert variant="default">
                <AlertDescription>{contractNumber ?? 'Null'}</AlertDescription>
              </Alert>
            </div>
          )}
          {contractAmount !== null && (
            <div className="space-y-2">
              <h3 className="font-semibold">Extracted Contract Amount:</h3>
              <Alert variant="default">
                <AlertDescription>{contractAmount !== null ? `$${contractAmount.toLocaleString()}` : 'Null'}</AlertDescription>
              </Alert>
            </div>
          )}
          {constructorName !== null && (
            <div className="space-y-2">
              <h3 className="font-semibold">Extracted Constructor Name:</h3>
              <Alert variant="default">
                <AlertDescription>{constructorName ?? 'Null'}</AlertDescription>
              </Alert>
            </div>
          )}
          {constructorAddress !== null && (
            <div className="space-y-2">
              <h3 className="font-semibold">Extracted Constructor Address:</h3>
              <Alert variant="default">
                <AlertDescription>{constructorAddress ?? 'Null'}</AlertDescription>
              </Alert>
            </div>
          )}
          {projectName !== null && (
            <div className="space-y-2">
              <h3 className="font-semibold">Extracted Project Name:</h3>
              <Alert variant="default">
                <AlertDescription>{projectName ?? 'Null'}</AlertDescription>
              </Alert>
            </div>
          )}
          {projectAddress !== null && (
            <div className="space-y-2">
              <h3 className="font-semibold">Extracted Project Address:</h3>
              <Alert variant="default">
                <AlertDescription>{projectAddress ?? 'Null'}</AlertDescription>
              </Alert>
            </div>
          )}
          {ownerName !== null && (
            <div className="space-y-2">
              <h3 className="font-semibold">Extracted Owner Name:</h3>
              <Alert variant="default">
                <AlertDescription>{ownerName ?? 'Null'}</AlertDescription>
              </Alert>
            </div>
          )}
          {ownerAddress !== null && (
            <div className="space-y-2">
              <h3 className="font-semibold">Extracted Owner Address:</h3>
              <Alert variant="default">
                <AlertDescription>{ownerAddress ?? 'Null'}</AlertDescription>
              </Alert>
            </div>
          )}
          {architectName !== null && (
            <div className="space-y-2">
              <h3 className="font-semibold">Extracted Architect Name:</h3>
              <Alert variant="default">
                <AlertDescription>{architectName ?? 'Null'}</AlertDescription>
              </Alert>
            </div>
          )}
          {architectAddress !== null && (
            <div className="space-y-2">
              <h3 className="font-semibold">Extracted Architect Address:</h3>
              <Alert variant="default">
                <AlertDescription>{architectAddress ?? 'Null'}</AlertDescription>
              </Alert>
            </div>
          )}
          {scopeOfWork !== null && (
            <div className="space-y-2">
              <h3 className="font-semibold">Extracted Scope of Work:</h3>
              <Alert variant="default">
                <AlertDescription>{scopeOfWork ?? 'Null'}</AlertDescription>
              </Alert>
            </div>
          )}
          {risks.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Detected Risks:</h3>
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
            <div className="space-y-2">
              <h3 className="font-semibold">Generated To-Do Items:</h3>
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
            <div className="space-y-2">
              <h3 className="font-semibold">Generated Exhibits from Risks:</h3>
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
          <Button variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}