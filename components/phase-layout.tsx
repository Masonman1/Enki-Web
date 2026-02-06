// components/phase-layout.tsx (UPDATED: Removed unused 'uploading' prop to fix lint warning; loading now fully guards UI including UploadZone)
'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Loader2 } from 'lucide-react'; // NEW: Add Loader2 for spinner
import UploadZone from '@/components/forms/upload-zone';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface PhaseLayoutProps {
  title: string;
  description: string;
  loading: boolean; // Centralized loading prop (e.g., for session/init/upload; guards all)
  error: string | null;
  risks: string[];
  generatedItems: string[];
  parsedEssentials?: Record<string, unknown>; // Optional for phase-specific display
  handleUpload: (files: File[]) => void;
  generateType: 'exhibits' | 'clauses' | 'notes' | 'packages';
  onEmailClick: () => void;
  children?: ReactNode;
  uploading: boolean; // NEW: For passing to UploadZone
}

export default function PhaseLayout({
  title,
  description,
  loading,
  error,
  risks,
  generatedItems,
  parsedEssentials = {},
  handleUpload,
  generateType,
  onEmailClick,
  children,
  uploading,
}: PhaseLayoutProps) {
  const router = useRouter();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin mr-2" /> Initializing Phase 1A...
    </div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <UploadZone onUpload={handleUpload} uploading={uploading} />

          {Object.keys(parsedEssentials).length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">Parsed Essentials</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(parsedEssentials).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{key}</TableCell>
                      <TableCell>{value !== null ? String(value) : 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {risks.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">Identified Risks</h3>
              <ul className="list-disc pl-5">
                {risks.map((risk, index) => (
                  <li key={index}>{risk}</li>
                ))}
              </ul>
            </div>
          )}

          {generatedItems.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold">Generated {generateType.charAt(0).toUpperCase() + generateType.slice(1)}</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
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
              <Button className="mt-4" onClick={onEmailClick}>
                One-Click Email {generateType.charAt(0).toUpperCase() + generateType.slice(1)}
              </Button>
            </div>
          )}

          {children}

          <Button className="mt-6" variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}