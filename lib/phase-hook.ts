// lib/phase-hook.ts (UPDATED: RLS-aligned path starting with '${focus}/user_${userId}/...' to match policy: path[1] = 'phase1a', path[2] = 'user_<uid>')
'use client'; // Client hook

import { Session } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { parseFiles } from '@/lib/ai-parse';
import { generateFromRisks } from '@/lib/ai-generate';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid'; // For unique paths
import { AuthChangeEvent } from '@supabase/supabase-js';  // NEW: Add for typing

export interface PhaseUploadOptions { // EXPORT: Type for config (used in phase-config.ts)
  focus: string; // e.g., 'phase1a'
  generateType: 'exhibits' | 'clauses' | 'notes' | 'packages'; // From generateFromRisks
  context?: { jurisdiction?: string; materialType?: string; leadTime?: number };
  extraParsedFields?: string[]; // e.g., ['contract_number', ...] for essentials display
  onGenerateCustom?: (risks: string[]) => Promise<string[]>; // Optional: Custom gen logic
}

export function usePhaseUpload(config: PhaseUploadOptions) { // UPDATED: Consume config for centralization
  const { 
    focus, 
    generateType, 
    context, 
    extraParsedFields, 
    onGenerateCustom 
  } = config;

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [risks, setRisks] = useState<string[]>([]);
  const [generatedItems, setGeneratedItems] = useState<string[]>([]);
  const [parsedEssentials, setParsedEssentials] = useState<Record<string, unknown>>({});
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (!supabase) {
        console.error('No Supabase client - check env vars');
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(session);
          setLoading(false);
        }
      } catch (err) {
        console.error('Session init error:', err);
        if (isMounted) setLoading(false);
      }
    }

    initSession();

    if (!supabase) return () => {}; // Early cleanup if no client

    const { data: authListener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, newSession: Session | null) => {  // UPDATED: Typed params
      setSession(newSession);
      if (!newSession && !window.location.pathname.startsWith('/phase1b')) {
        router.push('/');
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const handleUpload = async (files: File[]) => {
    if (!session?.user?.id && !window.location.pathname.startsWith('/phase1b')) {
      toast.error('Login required for this phase');
      return;
    }

    setUploading(true);
    setError(null);
    setRisks([]);
    setGeneratedItems([]);
    setParsedEssentials({});

    try {
      const fileUrls: string[] = [];
      const uniqueId = uuidv4();
      const userId = session?.user?.id || 'guest'; // Fallback for guest (e.g., Phase 1B)

      for (const file of files) {
        const path = `${focus}/user_${userId}/${uniqueId}/${file.name}`; // RLS-aligned
        const { error: uploadError } = await supabase.storage
          .from('enki-storage')
          .upload(path, file);

        if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

        const { data: { signedUrl } } = await supabase.storage
          .from('enki-storage')
          .createSignedUrl(path, 60); // 60s expiry for parse

        if (!signedUrl) throw new Error('Signed URL failed');
        fileUrls.push(signedUrl);
      }

      const parsedResults = await parseFiles(fileUrls, { focus, userId });

      const allRisks: string[] = [];
      const allParsed: Record<string, unknown>[] = [];

      for (const result of parsedResults) {
        if (result.error_msg) {
          throw new Error(result.error_msg);
        }
        allRisks.push(...(result.risks || []));
        allParsed.push(result);
      }

      setRisks(allRisks);

      // Filter essentials based on config (e.g., Phase 1A fields)
      const parsed = allParsed[0] || {}; // Assume single for now; extend for multi
      const filteredEssentials = extraParsedFields 
        ? Object.fromEntries(Object.entries(parsed).filter(([key]) => extraParsedFields.includes(key))) 
        : parsed;
      setParsedEssentials(filteredEssentials); // Now filters to config fields (e.g., for Phase 1A display)
      // Generate (custom or default)
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