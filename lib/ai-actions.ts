// lib/ai-actions.ts (refactored: Removed risk scan; orchestration for essentials/splits only)
'use server';

import { createClient } from '@supabase/supabase-js';
import { extractPdfText, extractMsgText, splitPdfByRanges } from '@/lib/ai-actions/file-utils'; // UPDATED: From file-utils
import { callAiForEssentials, callAiForSplits } from '@/lib/ai-actions/ai-calls';
import { uploadSplitPdfs, uploadOriginalFile } from '@/lib/ai-actions/storage-utils'; // NEW: Add uploadOriginalFile
import { ParsedJob, createFallbackParsed } from '@/lib/ai-actions/error-utils';

// NEW: ParsedJob now imported from error-utils.ts for type consistency

export async function parseFilesAction(fileUrls: string[], focus?: string, userId?: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const effectiveUserId = userId || 'guest';
  const results: ParsedJob[] = [];

  for (const url of fileUrls) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileName = new URL(url).pathname.split('/').pop() || 'unknown';
      const extension = fileName.split('.').pop()?.toLowerCase() || '';

      let text = '';
      if (extension === 'pdf') {
        text = await extractPdfText(buffer);
      } else if (extension === 'msg') {
        text = await extractMsgText(buffer);
      } else {
        throw new Error(`Unsupported file type: ${extension}`);
      }

      const essentials = await callAiForEssentials(text);
      const splits = await callAiForSplits(text); // Attempt for all (text-based)

      let splitTexts: Record<string, string> = {};
      let storagePath: string | null = null;

      if (extension === 'pdf') {
        const splitBuffers = await splitPdfByRanges(buffer, splits);
        for (const [section, buf] of Object.entries(splitBuffers)) {
          splitTexts[section] = await extractPdfText(buf);
        }
        storagePath = await uploadSplitPdfs(supabase, effectiveUserId, focus || 'phase1a', splitBuffers);
      } else {
        // For .msg: No buffer split; use full text (or approximate text splits if needed in future)
        splitTexts['full'] = text;
        storagePath = await uploadOriginalFile(supabase, effectiveUserId, focus || 'phase1a', buffer, fileName);
      }

      const parsed: ParsedJob = { ...essentials, splits, storage_path: storagePath }; // Removed risks
      results.push(parsed);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Grok parse error:', errorMsg);
      results.push(createFallbackParsed(errorMsg));
    }
  }

  return results;
}