// lib/phase-hook.ts (UPDATED: Minor tweaks for config integration; ensured consistent exports for session/loading; added optional onGenerateCustom handling from page/config if extended)
// No major changes needed as hook already consumes PhaseUploadOptions; clarified types and defaults for robustness
// FIXED: Supabase Storage RLS violation by aligning path to allowed folders ('jobs' as container) and user_<uid>; added signed URLs for private bucket parsing

'use client'; // Client hook

import { Session } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { parseFiles } from '@/lib/ai-parse';
import { generateFromRisks } from '@/lib/ai-generate';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid'; // For unique paths

export interface PhaseUploadOptions { // EXPORT: Type for config (used in phase-config.ts)
  focus: string; // e.g., 'phase1a'
  generateType: 'exhibits' | 'clauses' | 'notes' | 'packages'; // From generateFromRisks
  context?: { jurisdiction?: string; materialType?: string; leadTime?: number }; // Optional gen context
  extraParsedFields?: string[]; // e.g., ['contract_number', 'scope_of_work'] for essentials
  onGenerateCustom?: (risks: string[]) => Promise<string[]>; // Optional override for custom gen (e.g., Phase 1C products)
}

export function usePhaseUpload(options: PhaseUploadOptions) {
  const { focus, generateType, context = {}, extraParsedFields = [], onGenerateCustom } = options;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [risks, setRisks] = useState<string[]>([]);
  const [generatedItems, setGeneratedItems] = useState<string[]>([]);
  const [parsedEssentials, setParsedEssentials] = useState<Record<string, unknown> | undefined>(undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Consistent init loading (session check)
  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    const init = async () => {
      if (!supabase) {
        setError('Supabase not initialized');
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (!session) router.push('/');
      setLoading(false);
    };
    init();
  }, [supabase, router]);

  const handleUpload = async (files: File[]) => {
    if (files.length === 0 || loading || uploading) return; // Guard during loading/uploading
    setUploading(true);
    setError(null);
    setRisks([]);
    setGeneratedItems([]);
    setParsedEssentials(undefined);

    try {
      if (!session) throw new Error('No session');
      const userId = session.user.id;
      const userFolder = `user_${userId}`;
      const phaseFolder = focus; // e.g., 'phase1a'
      const filePaths: string[] = [];
      const signedUrls: string[] = [];

      for (const file of files) {
        const fileUniqueId = uuidv4();
        const uniquePath = `jobs/${userFolder}/${phaseFolder}/${fileUniqueId}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(uniquePath, file);

        if (uploadError) throw uploadError;
        filePaths.push(uniquePath);

        // Get signed URL for private bucket access (for pdf-parse in parseFiles)
        const { data, error: signError } = await supabase.storage
          .from('enki-storage')
          .createSignedUrl(uniquePath, 3600); // 1-hour expiry; adjust as needed

        if (signError || !data?.signedUrl) throw signError || new Error('Failed to sign URL');
        signedUrls.push(data.signedUrl);
      }

      const parsedResults = await parseFiles(signedUrls, { focus });
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