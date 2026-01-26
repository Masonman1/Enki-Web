// lib/ai-actions.ts (refactored: Prompts extracted to phase-specific files for modularity)
'use server'; // Server-only (unchanged)

import OpenAI from 'openai';
import pdf from 'pdf-parse'; // For initial text scan in section detection (no storage)
import { createClient } from '@supabase/supabase-js'; // For storing split PDFs
import { PDFDocument } from 'pdf-lib'; // For splitting PDFs by page ranges
import { v4 as uuidv4 } from 'uuid'; // Added for fallback UUID in paths

// Import phase-specific prompts (new modular structure)
import { composeEssentialsPrompt } from '@/lib/prompts/phase1a/essentials'; // Renamed from base
import { composeSplitPrompt } from '@/lib/prompts/phase1a/split-prompts'; // New for section ID
import { composeRiskPrompt, flattenRisks } from '@/lib/prompts/phase1a/risk-prompts'; // For risks post-split

// Extended interfaces
interface ParsedSplit {
  [section: string]: string; // e.g., { "schedule": "156-160", "insurance": "45-52" }
}

interface ParsedJob extends ParsedContract {
  splits: ParsedSplit;
  risks: string[]; // Flattened as before
  storage_path: string | null; // Dynamic path, e.g., 'jobs/Hillmont_Project/SR-039'
  error_msg?: string; // NEW: Optional for per-job errors
}

// Define interfaces for structured parsing (unchanged + new for splits)
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
  risks: string[];
}

// Update function signature
export async function parseFilesAction(
  fileUrls: string[], 
  subphase: 'essentials' | 'split' | 'risks' = 'essentials', // Default to chained start
  userId: string, // NEW: Required for auth/RLS (from session.user.id)
  storagePath?: string | null // NEW: Optional for chained calls (pass from prior ParsedJob)
): Promise<ParsedJob[]> { // NEW: Return array of ParsedJob for multi-file
  const results: ParsedJob[] = [];
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  const openai = new OpenAI({ 
    apiKey: process.env.GROK_API_KEY,
    baseURL: 'https://api.x.ai/v1/' // xAI base URL for Grok API compatibility
  });

  for (const url of fileUrls) {
    try {
      // Download file from signed/temp URL (assumes url is full signed URL; extract path for download)
      const filePath = new URL(url).pathname.split('/enki-storage/')[1]; // Extract path after bucket
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('enki-storage')
        .download(filePath);

      if (downloadError || !fileBlob) {
        throw new Error(`File download failed: ${downloadError?.message ?? 'No buffer'}`);
      }

      // Convert Blob to Buffer for pdf-parse and pdf-lib
      const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());

      // Extract full text for prompts (shared across subphases)
      const pdfData = await pdf(fileBuffer);
      let text = pdfData.text;

      // Truncate text to avoid token limits (Grok-4 max ~256k tokens; ~0.75 chars/token → safe 200k chars)
      const MAX_CHARS = 200000; // Adjust based on model limits; solution from prior iteration
      if (text.length > MAX_CHARS) {
        text = text.slice(0, MAX_CHARS) + '... [truncated for prompt length]';
      }

      // ... then proceed to prompt = compose... based on subphase
      let prompt: string;
      if (subphase === 'essentials') {
        prompt = composeEssentialsPrompt(text);
      } else if (subphase === 'split') {
        prompt = composeSplitPrompt(text);
      } else if (subphase === 'risks') {
        prompt = composeRiskPrompt(text);
      } else {
        throw new Error('Invalid subphase');
      }

      const completion = await openai.chat.completions.create({
        model: 'grok-4', // UPDATED: Use Grok 4 model (deprecated 'grok-beta' replaced)
        messages: [{ role: 'user', content: prompt }],
      });

      const rawParsed = JSON.parse(completion.choices[0].message.content!);

      let parsed: ParsedJob;
      if (subphase === 'essentials') {
        parsed = {
          contract_number: rawParsed?.contract_number ?? null,
          contract_amount: rawParsed?.contract_amount ?? null,
          constructor_name: rawParsed?.constructor_name ?? null,
          constructor_address: rawParsed?.constructor_address ?? null,
          project_name: rawParsed?.project_name ?? null,
          project_address: rawParsed?.project_address ?? null,
          owner_name: rawParsed?.owner_name ?? null,
          owner_address: rawParsed?.owner_address ?? null,
          architect_name: rawParsed?.architect_name ?? null,
          architect_address: rawParsed?.architect_address ?? null,
          scope_of_work: rawParsed?.scope_of_work ?? null,
          risks: flattenRisks(rawParsed),
          splits: {}, // Placeholder
          storage_path: null // Placeholder
        };
      } else if (subphase === 'split') {
        parsed = {
          // Fallback essentials
          contract_number: null,
          contract_amount: null,
          constructor_name: null,
          constructor_address: null,
          project_name: null,
          project_address: null,
          owner_name: null,
          owner_address: null,
          architect_name: null,
          architect_address: null,
          scope_of_work: null,
          risks: [],
          splits: rawParsed ?? {}, // Assuming rawParsed is { section: 'start-end' }
          storage_path: null
        };
      } else {
        parsed = {
          // Fallback essentials
          contract_number: null,
          contract_amount: null,
          constructor_name: null,
          constructor_address: null,
          project_name: null,
          project_address: null,
          owner_name: null,
          owner_address: null,
          architect_name: null,
          architect_address: null,
          scope_of_work: null,
          risks: flattenRisks(rawParsed),
          splits: {},
          storage_path: null
        };
      }

      // Handle "Null" as null
      for (const key in parsed) {
        if (parsed[key as keyof ParsedJob] === "Null") {
          parsed[key as keyof ParsedJob] = null;
        }
      }

      // Helper: Sanitize for storage paths
      function sanitizeForPath(str: string | null): string {
        if (!str) return 'unknown';
        return str.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50); // Safe, truncated
      }

      if (subphase === 'essentials') {
        try {
          // Insert into jobs table
          const { data: job, error: insertError } = await supabase
            .from('jobs')
            .insert({
              user_id: userId,
              contract_number: parsed.contract_number,
              contract_amount: parsed.contract_amount,
              constructor_name: parsed.constructor_name,
              constructor_address: parsed.constructor_address,
              project_name: parsed.project_name,
              project_address: parsed.project_address,
              owner_name: parsed.owner_name,
              owner_address: parsed.owner_address,
              architect_name: parsed.architect_name,
              architect_address: parsed.architect_address,
              scope_of_work: parsed.scope_of_work,
              risks: parsed.risks // Array
            })
            .select()
            .single();

          if (insertError || !job) {
            throw new Error(`Job insert failed: ${insertError?.message}`);
          }

          // Generate dynamic path
          const projSlug = sanitizeForPath(parsed.project_name);
          const numSlug = sanitizeForPath(parsed.contract_number) || uuidv4().slice(0, 8); // Fallback UUID snippet
          const storagePathLocal = `jobs/${projSlug}/${numSlug}`; // Renamed to avoid conflict

          // Update job with storage_path
          const { error: updateError } = await supabase
            .from('jobs')
            .update({ storage_path: storagePathLocal })
            .eq('id', job.id);

          if (updateError) {
            throw new Error(`Path update failed: ${updateError.message}`);
          }
          parsed.storage_path = storagePathLocal;
        } catch (insertErr: any) {
          console.error(`Essentials insert error: ${insertErr.message}`);
          parsed.storage_path = `jobs/fallback/${uuidv4().slice(0, 8)}`;
          parsed.error_msg = `Job insert failed: ${insertErr.message}; using fallback path`;
        }
      }

      // For 'split' or 'risks', use storagePath if provided
      if (subphase === 'split' || subphase === 'risks') {
        parsed.storage_path = storagePath ?? parsed.storage_path;
      }

      // After parsing 'parsed' and essentials insert...
      if (subphase === 'split') {
        if (!parsed.storage_path) {
          // In chained calls, this would come from prior essentials; fallback for standalone
          console.warn('No storage_path; using temp');
          parsed.storage_path = `temp_splits/${uuidv4()}`;
        }

        const originalPdf = await PDFDocument.load(fileBuffer); // Reuse downloaded buffer
        const splitUrls: Record<string, string> = {}; // For optional return in splits

        for (const [section, range] of Object.entries(parsed.splits)) {
          try {
            const [start, end] = range.split('-').map(Number);
            if (isNaN(start) || isNaN(end) || start > end) continue; // Skip invalid

            const splitDoc = await PDFDocument.create();
            const copiedPages = await splitDoc.copyPages(originalPdf, Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i));
            copiedPages.forEach((page) => splitDoc.addPage(page));

            const splitBuffer = await splitDoc.save();

            const splitPath = `${parsed.storage_path}/splits/${sanitizeForPath(section)}.pdf`;
            const { error: uploadError } = await supabase.storage
              .from('enki-storage')
              .upload(splitPath, splitBuffer, { contentType: 'application/pdf' });

            if (uploadError) {
              throw new Error(`Split upload failed for ${section}: ${uploadError.message}`);
            }

            // Optional: Get signed URL for risks phase
            const { data: signedData } = await supabase.storage
              .from('enki-storage')
              .createSignedUrl(splitPath, 3600); // 1hr expiry
            if (signedData?.signedUrl) splitUrls[section] = signedData.signedUrl;
          } catch (splitErr: any) {
            console.error(`Split error for ${section}: ${splitErr.message}`);
            // Continue to next section
          }
        }

        // Optionally attach URLs to parsed (for chain)
        // parsed.split_urls = splitUrls; // If adding to interface
      }

      // After 'split' block...
      if (subphase === 'risks') {
        if (!parsed.storage_path) {
          throw new Error('No storage_path for risks');
        }

        // Assume splits from prior; list files in storage_path/splits/
        const { data: splitFiles, error: listError } = await supabase.storage
          .from('enki-storage')
          .list(`${parsed.storage_path}/splits`);

        if (listError || !splitFiles?.length) {
          console.warn('No splits; falling back to full text risks');
          // Run on full text
          const riskPrompt = composeRiskPrompt(text);
          const completion = await openai.chat.completions.create({ model: 'grok-4', messages: [{ role: 'user', content: riskPrompt }] });
          const rawRisks = JSON.parse(completion.choices[0].message.content!);
          parsed.risks = flattenRisks(rawRisks);
        } else {
          const allRisks: string[] = [];
          for (const file of splitFiles) {
            try {
              const splitPath = `${parsed.storage_path}/splits/${file.name}`;
              const { data: splitBlob } = await supabase.storage.from('enki-storage').download(splitPath);
              if (!splitBlob) continue;

              // Convert Blob to Buffer for pdf-parse
              const splitBuffer = Buffer.from(await splitBlob.arrayBuffer());

              const splitData = await pdf(splitBuffer);
              let splitText = splitData.text;

              // Truncate per-section text if needed (though splits are smaller)
              if (splitText.length > MAX_CHARS) {
                splitText = splitText.slice(0, MAX_CHARS) + '... [truncated for prompt length]';
              }

              const riskPrompt = composeRiskPrompt(splitText);
              const completion = await openai.chat.completions.create({ model: 'grok-4', messages: [{ role: 'user', content: riskPrompt }] });
              const rawRisks = JSON.parse(completion.choices[0].message.content!);
              allRisks.push(...flattenRisks(rawRisks));
            } catch (riskErr: any) {
              console.error(`Risk parse error for ${file.name}: ${riskErr.message}`);
              // Continue, risks partial
            }
          }
          parsed.risks = allRisks;
        }

        // Update job with aggregated risks (assume job_id from context or query by user/contract_number)
        // For simplicity: Query by user_id and contract_number (if available)
        if (parsed.contract_number) {
          const { error: updateError } = await supabase
            .from('jobs')
            .update({ risks: parsed.risks })
            .eq('user_id', userId)
            .eq('contract_number', parsed.contract_number);

          if (updateError) console.warn(`Risks update failed: ${updateError.message}`);
        }
      }

      results.push(parsed);
    } catch (error: any) {
      console.error('Grok parse error:', error);
      const fallbackParsed: ParsedJob = {
        contract_number: null,
        contract_amount: null,
        constructor_name: null,
        constructor_address: null,
        project_name: null,
        project_address: null,
        owner_name: null,
        owner_address: null,
        architect_name: null,
        architect_address: null,
        scope_of_work: null,
        risks: [],
        splits: {},
        storage_path: null,
        error_msg: `Overall error: ${error.message}`
      };
      results.push(fallbackParsed);
    }
  }

  return results;
}