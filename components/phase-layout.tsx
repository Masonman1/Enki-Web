// components/phase-layout.tsx
'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';
import UploadZone from '@/components/forms/upload-zone';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface PhaseLayoutProps {
  title: string;
  description: string;
  uploading: boolean;
  error: string | null;
  risks: string[];
  generatedItems: string[];
  parsedEssentials?: Record<string, unknown>; // Optional for phases like 1A
  handleUpload: (files: File[]) => void;
  generateType: 'exhibits' | 'clauses' | 'notes' | 'packages'; // From ai-generate
  // Removed: context?: { jurisdiction?: string; materialType?: string; leadTime?: number };
  onEmailClick?: () => void; // Optional custom handler
  children?: ReactNode; // For phase-specific extensions
}

export default function PhaseLayout({
  title,
  description,
  uploading,
  error,
  risks,
  generatedItems,
  parsedEssentials,
  handleUpload,
  generateType,
  // Removed: context, (from destructuring)
  onEmailClick = () => toast.success(`Stub: One-click email ${generateType} to GC`),
  children,
}: PhaseLayoutProps) {
  const router = useRouter();

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
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

          {uploading && <p className="mt-4">Uploading and processing...</p>}

          {parsedEssentials && Object.keys(parsedEssentials).length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Parsed Essentials</h3>
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
                      <TableCell>{key}</TableCell>
                      <TableCell>{value ? value.toString() : 'Null'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {risks.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Identified Risks</h3>
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