'use client'; // Client component for hooks and interactivity

import { useState, useEffect } from 'react'; // For state and session effect
import { useRouter } from 'next/navigation'; // For navigation/redirect
import { useSupabase } from '@/lib/supabase'; // Singleton hook for Supabase client
import UploadZone from '@/components/forms/upload-zone'; // Reuse for drag-drop
import toast from "react-hot-toast"; // For success/error alerts
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Fixed: Missing imports for shadcn/ui components

export default function TestStorage() {
  const [files, setFiles] = useState<File[]>([]); // State for uploaded files
  const [loading, setLoading] = useState(false); // State for loading indicator
  const [session, setSession] = useState(null); // State for Supabase session
  const router = useRouter(); // For navigation/redirect
  const supabase = useSupabase(); // Supabase client

  // UseEffect to fetch session and handle auth changes (aligned with Phase 1 auth pattern)
  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) router.push('/'); // Redirect if not authenticated
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => authListener.subscription.unsubscribe();
  }, [supabase, router]);

  if (!session) return <div>Loading session...</div>; // Handle null session during load

  // Handle upload function (minimal: upload to bucket with metadata, debug logs)
  const handleUpload = async (uploadedFiles: File[]) => {
    setFiles(uploadedFiles);
    setLoading(true);
    try {
      // Debug: Log session uid for RLS/ownership check
      console.log('Debug: User ID:', session.user.id);

      // Upload loop for multiple files (aligned with Phase 1 pattern)
      const uploadPromises = uploadedFiles.map(async (file) => {
        const safeName = file.name.replace(/[\[\]]/g, '').replace(/\s/g, '_'); // Sanitize file name
        const userFolder = `user_${session.user.id}`; // User folder for ownership
        const path = `jobs/${userFolder}/phase1b/${safeName}`; // Path structure (change here to test different formats)
        console.log('Debug: Upload path:', path); // Debug: Verify path
        console.log('Debug: File type:', file.type); // Debug: Verify contentType

        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage') // Bucket name (change here to test different buckets)
          .upload(path, file, {
            upsert: true, // Allow overwrite if file exists
            contentType: file.type, // Auto-set MIME type
            metadata: { phase: '1B', type: 'essentials', jobId: session.user.id } // Metadata for DB linking (blueprint-aligned)
          });

        if (uploadError) {
          console.error('Debug: Upload Error Details:', uploadError.message, uploadError.status, uploadError.body); // Full error log
          throw uploadError;
        }

        console.log('Debug: Upload Success Data:', data); // Debug: Confirm response
        return data.path;
      });
      await Promise.all(uploadPromises);
      toast.success('Upload successful! Check console for details.');
    } catch (error) {
      console.error('Detailed Supabase Error:', error); // Log full object for body
      if (error.body) console.log('Error Body:', error.body); // Specific for 400 message
      toast.error('Upload failed: ' + (error.message || 'Check console'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Test Storage Upload</CardTitle>
          <CardDescription>Drag-drop PDF to test upload to Supabase storage.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <UploadZone onUpload={handleUpload} />
          {loading && <div>Loading...</div>} {/* Loading indicator */}
          {files.length > 0 && (
            <div>
              <h3 className="font-semibold">Selected Files:</h3>
              <ul className="list-disc pl-5">
                {files.map((file, idx) => <li key={idx}>{file.name}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}