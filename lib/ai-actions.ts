// lib/ai-actions.ts (refactored: Now orchestration-only, no risks update per schema)
// 'use server';

import { createClient } from '@supabase/supabase-js';
import { extractPdfText, splitPdfByRanges } from '@/lib/ai-actions/pdf-utils'; // Add '@/lib/ai-actions/'
import { callAiForEssentials, callAiForSplits, callAiForRisks } from '@/lib/ai-actions/ai-calls';
import { uploadSplitPdfs } from '@/lib/ai-actions/storage-utils'; // Remove updateJobRisks import
import { ParsedJob, createFallbackParsed } from '@/lib/ai-actions/error-utils'; // UPDATED: Add ParsedJob import

// NEW: ParsedJob now imported from error-utils.ts for type consistency

export async function parseFilesAction(fileUrls: string[], focus?: string, userId?: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const effectiveUserId = userId || 'guest'; // Fallback for guest mode (e.g., Phase 1B)

  const results: ParsedJob[] = [];

  for (const url of fileUrls) {
    try {
      const buffer = await fetch(url).then(res => res.arrayBuffer()).then(Buffer.from);
      const text = await extractPdfText(buffer);

      const essentials = await callAiForEssentials(text);
      const splits = await callAiForSplits(text); // Note: composeSplitPrompt uses headings scan
      const splitBuffers = await splitPdfByRanges(buffer, splits);
      const risks = await callAiForRisks(splitBuffers);

      const storagePath = await uploadSplitPdfs(supabase, effectiveUserId, focus || 'phase1a', splitBuffers);

      const parsed: ParsedJob = { ...essentials, splits, risks, storage_path: storagePath };
      // Removed: await updateJobRisks(...) — no risks column per schema; risks transient for generation

      results.push(parsed);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Grok parse error:', errorMsg);
      results.push(createFallbackParsed(errorMsg));
    }
  }

  return results;
}