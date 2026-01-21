// lib/phase-hook.ts
'use client'; // Client hook

import { Session } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { parseFiles } from '@/lib/ai-parse';
import { generateFromRisks } from '@/lib/ai-generate';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid'; // For unique paths

interface PhaseUploadOptions {
  focus: string; // e.g., 'phase1a'
  generateType: 'exhibits' | 'clauses' | 'notes' | 'packages'; // From generateFromRisks
  context?: { jurisdiction?: string; materialType?: string; leadTime?: number }; // Optional gen context
  extraParsedFields?: string[]; // e.g., ['contract_number', 'scope_of_work'] for essentials
  onGenerateCustom?: (risks: string[]) => Promise<string[]>; // Optional override for custom gen
}

export function usePhaseUpload(options: PhaseUploadOptions) {
  const { focus, generateType, context = {}, extraParsedFields = [], onGenerateCustom } = options;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [risks, setRisks] = useState<string[]>([]);
  const [generatedItems, setGeneratedItems] = useState<string[]>([]);
  const [parsedEssentials, setParsedEssentials] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true); // Session loading state
  const supabase = useSupabase();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  // Fetch session on mount
  useEffect(() => {
    const getSession = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) {
        router.push('/'); // Redirect only after fetch completes
      }
      setLoading(false); // Fetch done
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
    setGeneratedItems([]);
    setParsedEssentials({});

    try {
      const fileUrls: string[] = [];

      for (const file of acceptedFiles) {
        const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.-]/g, ''); // Sanitize
        const filePath = `jobs/user_${session.user.id}/${uuidv4()}/${safeName}`; // FIXED: Use 'jobs' (allowed by RLS) instead of 'phase'
        const { error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw uploadError;
        }

        const { data: signedData, error: signError } = await supabase.storage
          .from('enki-storage')
          .createSignedUrl(filePath, 3600); // 1-hour temp URL for parsing

        if (signError) {
          console.error('Signed URL error:', signError);
          throw signError;
        }

        if (!signedData?.signedUrl) throw new Error('Failed to generate signed URL');
        fileUrls.push(signedData.signedUrl);
      }

      const parsedResults = await parseFiles(fileUrls, { focus });
      console.log('Parsed results:', parsedResults); // Debug

      const allRisks = parsedResults.flatMap(r => r.risks || []);
      setRisks(allRisks);

      // Extract essentials if specified
      if (extraParsedFields.length > 0 && parsedResults.length > 0) {
        const essentials: Record<string, unknown> = {};
        extraParsedFields.forEach(field => {
          essentials[field] = parsedResults[0][field as keyof typeof parsedResults[0]] ?? null;
        });
        setParsedEssentials(essentials);
      }

      let generated: string[];
      if (onGenerateCustom) {
        generated = await onGenerateCustom(allRisks);
      } else {
        generated = await generateFromRisks(allRisks, { type: generateType, context });
      }

      setGeneratedItems(generated);
      toast.success('Processing complete!');

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      console.error('Upload/parse error:', err);
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    error,
    risks,
    generatedItems,
    parsedEssentials,
    handleUpload,
    session,
    loading,
  };
}