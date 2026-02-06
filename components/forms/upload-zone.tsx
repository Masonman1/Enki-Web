// components/forms/upload-zone.tsx
'use client'; // Client component for hooks

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react'; // UPDATED: Add Loader2

interface UploadZoneProps {
  onUpload: (files: File[]) => void;
  uploading: boolean; // NEW: Pass from PhaseLayout/usePhaseUpload
}

export default function UploadZone({ onUpload, uploading }: UploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (typeof onUpload !== 'function') {
      setError('Upload handler not provided');
      return;
    }
    setFiles(acceptedFiles);
    setError(null);
    onUpload(acceptedFiles); // Call standardized prop
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const clearFiles = () => {
    setFiles([]);
  };

  return (
    <div>
      {uploading && <div className="flex items-center justify-center mb-2"><Loader2 className="h-6 w-6 animate-spin" /> Processing...</div>}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-4 rounded-md text-center cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
      >
        <input {...getInputProps()} />
        <p>{isDragActive ? 'Drop PDFs here...' : 'Drag & drop PDFs, or click to select'}</p>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold">Selected Files:</h4>
          <ul className="list-disc pl-5">
            {files.map((file) => (
              <li key={file.name} className="text-sm">{file.name}</li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="mt-2" onClick={clearFiles}>Clear</Button>
        </div>
      )}
    </div>
  );
}