// app/test-storage/page.tsx (UPDATED: Correct import for FileObject from storage-js; TS fix)

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { AuthChangeEvent, Session } from '@supabase/supabase-js'; // For auth typing
import { FileObject } from '@supabase/storage-js'; // Correct import for FileObject
import UploadZone from '@/components/forms/upload-zone'; // Reuse for drag-drop
import toast from "react-hot-toast"; // For success/error alerts
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // shadcn/ui components
import { Button } from '@/components/ui/button'; // For download/upload actions
import { Alert, AlertDescription } from '@/components/ui/alert'; // For error display (add if not already)

export default function TestStorage() {
  const supabase = useSupabase();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [fileUrls, setFileUrls] = useState<string[]>([]); // For downloaded URLs
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    }
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => setSession(session));

    return () => authListener.subscription.unsubscribe();
  }, [supabase, router]);

  const handleUpload = async (files: File[]) => {
    if (!session) {
      setError('Login required for uploads');
      return;
    }
    try {
      for (const file of files) {
        const path = `test/${session.user.id}/${file.name}`; // RLS-aligned path
        const { error: uploadError } = await supabase.storage.from('enki-storage').upload(path, file);
        if (uploadError) throw uploadError;
      }
      toast.success('Upload successful!');
    } catch (err) {
      setError('Upload failed: ' + (err as Error).message);
    }
  };

  const handleDownload = async () => {
    if (!session) {
      setError('Login required for downloads');
      return;
    }
    try {
      const { data } = await supabase.storage.from('enki-storage').list(`test/${session.user.id}`);
      const urls = await Promise.all(
        (data ?? []).map(async (file: FileObject) => {  // Type 'file' as FileObject
          const { data: signed } = await supabase.storage.from('enki-storage').createSignedUrl(`test/${session.user.id}/${file.name}`, 60);
          return signed?.signedUrl || '';
        })
      );
      setFileUrls(urls.filter(Boolean));
      toast.success('Files listed!');
    } catch (err) {
      setError('Download list failed: ' + (err as Error).message);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Test Storage Page</CardTitle>
          <CardDescription>Test Supabase storage uploads/downloads with RLS (e.g., for Phase 1A splits)</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
          <UploadZone onUpload={handleUpload} />
          <Button onClick={handleDownload} className="mt-4">List & Get Signed URLs</Button>
          {fileUrls.length > 0 && (
            <div className="mt-4">
              <h3>Downloaded File URLs (valid 60s):</h3>
              <ul>
                {fileUrls.map((url, idx) => (
                  <li key={idx}><a href={url} target="_blank" rel="noopener noreferrer">Download File {idx + 1}</a></li>
                ))}
              </ul>
            </div>
          )}
          <Button variant="outline" onClick={() => router.push('/dashboard')} className="mt-6">Back to Dashboard</Button>
        </CardContent>
      </Card>
    </div>
  );
}