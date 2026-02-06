// lib/phase-hook.ts (SWITCHED: To Sonner for stable .update-free API; ID-based overwrite for progress)
'use client'; // Client hook

import { Session } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { parseFiles } from '@/lib/ai-parse';
import { generateFromRisks } from '@/lib/ai-generate';
import { toast } from 'sonner'; // NEW: Sonner import (named { toast })
import { v4 as uuidv4 } from 'uuid'; // For unique paths
import { AuthChangeEvent } from '@supabase/supabase-js';  // NEW: Add for typing

export interface PhaseUploadOptions { // EXPORT: Type for config (used in phase-config.ts)
  focus: string; // e.g., 'phase1a'
  generateType: 'exhibits' | 'clauses' | 'notes' | 'packages'; // From generateFromRisks
  context?: { jurisdiction?: string; materialType?: string; leadTime?: number };
  extraParsedFields?: string[]; // Fields to display/filter from parsedEssentials
  onGenerateCustom?: (risks: string[]) => Promise<string[]>; // Optional custom generator
}

export function usePhaseUpload(config: PhaseUploadOptions) {
  const { focus, generateType, context = {}, extraParsedFields = [], onGenerateCustom } = config;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [risks, setRisks] = useState<string[]>([]);
  const [generatedItems, setGeneratedItems] = useState<string[]>([]);
  const [parsedEssentials, setParsedEssentials] = useState<Record<string, unknown>>({});
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Centralized loading (auth + init)
  const router = useRouter();
  const supabase = useSupabase();

  useEffect(() => {
    async function getSession() {
      if (!supabase) {
        router.push('/');
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    }
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession);
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, [router, supabase]);

  const handleUpload = async (files: File[]) => {
    setUploading(true);
    setError(null);
    const toastId = 'upload-progress'; // NEW: Fixed ID for Sonner overwrite
    toast.loading('Starting upload...', { id: toastId }); // Initial feedback

    try {
      const fileUrls: string[] = [];
      for (const file of files) {
        toast(`Uploading ${file.name}...`, { id: toastId }); // Overwrite with new message
        const path = `${focus}/user_${session?.user?.id || 'guest'}/${uuidv4()}/${file.name}`;
        const { data, error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(path, file);

        if (uploadError) throw uploadError;
        const { data: { signedUrl } } = await supabase.storage
          .from('enki-storage')
          .createSignedUrl(path, 60); // 60s expiry for parse

        fileUrls.push(signedUrl!);
      }

      toast('Parsing files...', { id: toastId });
      const parsedResults = await parseFiles(fileUrls, { focus: config.focus, userId: session?.user?.id });

      let allEssentials: Record<string, unknown> = {};

      parsedResults.forEach((parsed) => {
        if (parsed.error_msg) {
          throw new Error(parsed.error_msg);
        }
        allEssentials = { ...allEssentials, ...parsed };
      });

      setRisks([]); // Placeholder until trigger match

      const filteredEssentials = extraParsedFields.length > 0
        ? Object.fromEntries(Object.entries(allEssentials).filter(([key]) => extraParsedFields.includes(key))) 
        : allEssentials;
      setParsedEssentials(filteredEssentials); // Now filters to config fields (e.g., for Phase 1A display)

      toast('Generating exhibits...', { id: toastId });
      // Generate (custom or default)
      let generated: string[];
      if (onGenerateCustom) {
        generated = await onGenerateCustom(allRisks);
      } else {
        generated = await generateFromRisks(allRisks, { type: generateType, context });
      }

      setGeneratedItems(generated);
      toast.dismiss(toastId);
      toast.success('Processing complete!');

    } catch (err: unknown) {
      toast.dismiss(toastId);
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