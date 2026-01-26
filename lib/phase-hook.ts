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

export interface PhaseUploadOptions { // EXPORT: Type for config (used in phase-config.ts)
  focus: string; // e.g., 'phase1a'
  generateType: 'exhibits' | 'clauses' | 'notes' | 'packages'; // From generateFromRisks
  context?: { jurisdiction?: string; materialType?: string; leadTime?: number };
  extraParsedFields?: string[]; // e.g., ['contract_number', ...] for essentials display
  onGenerateCustom?: (risks: string[]) => Promise<string[]>; // Optional page-specific override
}

export function usePhaseUpload(config: PhaseUploadOptions) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true); // Covers init + session check
  const [uploading, setUploading] = useState(false); // Separate for upload/parse
  const [error, setError] = useState<string | null>(null);
  const [risks, setRisks] = useState<string[]>([]);
  const [generatedItems, setGeneratedItems] = useState<string[]>([]);
  const [parsedEssentials, setParsedEssentials] = useState<Record<string, unknown>>({});
  const router = useRouter();
  const supabase = useSupabase();

  const {
    focus,
    generateType,
    context = {},
    extraParsedFields = [],
    onGenerateCustom,
  } = config;

  useEffect(() => {
    async function initSession() {
      if (!supabase) {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);

      if (!session && !window.location.pathname.startsWith('/phase1b')) {
        router.push('/');
      }
    }

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession && !window.location.pathname.startsWith('/phase1b')) {
        router.push('/');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase, router]);

  const handleUpload = async (files: File[]) => {
    if (!supabase || !session) {
      setError('Auth required for upload');
      return;
    }

    setUploading(true);
    setError(null);
    setRisks([]);
    setGeneratedItems([]);
    setParsedEssentials({});

    try {
      // Upload to RLS-aligned temp path (phase prefix directly + user-specific: '${focus}/user_${userId}/${uuid}/${file.name}')
      const userPath = `${focus}/user_${session.user.id}/${uuidv4()}`; // Matches policy: path[1] = 'phase1a', path[2] = 'user_<uid>'
      const urls: string[] = [];

      for (const file of files) {
        const filePath = `${userPath}/${file.name}`;
        const { error: uploadErr } = await supabase.storage
          .from('enki-storage')
          .upload(filePath, file);

        if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

        // Get signed URL for parse (private bucket)
        const { data: { signedUrl } } = await supabase.storage
          .from('enki-storage')
          .createSignedUrl(filePath, 3600); // 1hr expiry

        if (!signedUrl) throw new Error('Signed URL failed');
        urls.push(signedUrl);
      }

      // Parse (chained in ai-parse.ts; pass userId)
      const parsed = await parseFiles(urls, { focus: config.focus, userId: session.user.id });

      // Aggregate risks (flatten across files)
      const allRisks = parsed.risks ?? []; // From chained risks

      setRisks(allRisks);
      setParsedEssentials(parsed); // Full essentials

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