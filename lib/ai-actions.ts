// lib/ai-actions.ts (refactored: Now orchestration-only, no risks update per schema)
// 'use server';

import { createClient } from '@supabase/supabase-js';
import { extractPdfText, splitPdfByRanges } from '@/lib/ai-actions/pdf-utils'; // Add '@/lib/ai-actions/'
import { callAiForEssentials, callAiForSplits, callAiForRisks } from '@/lib/ai-actions/ai-calls';
import { uploadSplitPdfs } from '@/lib/ai-actions/storage-utils'; // Remove updateJobRisks import
import { createFallbackParsed } from '@/lib/ai-actions/error-utils';

interface ParsedContract {
  contract_number: string | null;
  contract_amount: number | null;
  constructor_name: string | null;
  constructor_address: string | null;
  project_name: string | null;
  project_address: string | null;
  owner_name: string | null;
  owner_address: string | null;
  architect_name: string | null;
  architect_address: string | null;
  scope_of_work: string | null;
}

interface ParsedSplit {
  [section: string]: string; // e.g., { "schedule": "156-160", "insurance": "45-52" }
}

interface ParsedJob extends ParsedContract {
  splits: ParsedSplit;
  risks: string[]; // Flattened waterproofing risks (e.g., substrate misses)—transient, not stored
  storage_path: string | null;
  error_msg?: string; // Optional for fallbacks
}

export async function parseFilesAction(fileUrls: string[], focus?: string, userId?: string): Promise<ParsedJob[]> {
  const results: ParsedJob[] = [];
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Undefined');
  console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set (length: ' + process.env.SUPABASE_SERVICE_KEY.length + ')' : 'Undefined');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!); // Use correct keys from .env.local
  const effectiveUserId = userId || 'extract-from-session'; // Use passed or fallback; renamed to avoid conflict

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