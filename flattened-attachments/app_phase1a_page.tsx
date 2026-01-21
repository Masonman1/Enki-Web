// app/phase1a/page.tsx
'use client';

import { useRouter } from 'next/navigation'; // Kept—used for back button
import { usePhaseUpload } from '@/lib/phase-hook';
import UploadZone from '@/components/forms/upload-zone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Phase1A() {
  const router = useRouter();
  const { 
    uploading, 
    error, 
    risks, 
    generatedItems, 
    parsedEssentials, 
    handleUpload, 
    loading // Destructure loading for session handling
    // REMOVED: session (unused—hook manages redirects)
  } = usePhaseUpload({
    focus: 'phase1a',
    generateType: 'exhibits',
    extraParsedFields: [
      'contract_number',
      'contract_amount',
      'constructor_name',
      'constructor_address',
      'project_name',
      'project_address',
      'owner_name',
      'owner_address',
      'architect_name',
      'architect_address',
      'scope_of_work'
    ],
    context: { jurisdiction: 'US', materialType: 'membrane', leadTime: 4 },
  });

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading session...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Phase 1A: Pre-Bid Subcontract Essentials & Risks</CardTitle>
          <CardDescription>
            Upload subcontract PDFs to extract key details, identify risks (e.g., waterproofing sequencing, substrate gaps), and generate protective exhibits/clauses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UploadZone onUpload={handleUpload} />
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {uploading && <p className="mt-4">Processing uploads...</p>}

          {Object.keys(parsedEssentials).length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Extracted Essentials</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(parsedEssentials).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{key.replace(/_/g, ' ').toUpperCase()}</TableCell>
                      <TableCell>{value ? String(value) : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {risks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Identified Risks/Misses</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {risks.map((risk, index) => (
                    <TableRow key={index}>
                      <TableCell>{risk}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {generatedItems.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Generated Exhibits/Clauses</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exhibit/Clause</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button className="mt-4" onClick={() => toast.success('Stub: One-click email protected exhibits to GC')}>
                One-Click Email Exhibits
              </Button>
            </div>
          )}

          <Button className="mt-6" variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}