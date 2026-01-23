// lib/ai-actions.ts (refactored: Prompts extracted to phase-specific files for modularity)
'use server'; // Server-only (unchanged)

import OpenAI from 'openai';
import pdf from 'pdf-parse'; // For initial text scan in section detection (no storage)
import { createClient } from '@supabase/supabase-js'; // For storing split PDFs
import { PDFDocument } from 'pdf-lib'; // For splitting PDFs by page ranges

// Import phase-specific prompts (new modular structure)
import { composeEssentialsPrompt } from '@/lib/prompts/phase1a/essentials'; // Renamed from base
import { composeSplitPrompt } from '@/lib/prompts/phase1a/split-prompts'; // New for section ID
import { composeRiskPrompt, flattenRisks } from '@/lib/prompts/phase1a/risk-prompts'; // For risks post-split

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

interface SectionRanges {
  [section: string]: string; // e.g., { 'schedule': '156-160', 'insurance': '45-52' }
}

// Initialize Grok client server-side (unchanged)
console.log('GROK_API_KEY check:', process.env.GROK_API_KEY ? 'Set (length: ' + process.env.GROK_API_KEY.length + ')' : 'Missing!');
const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

if (!process.env.GROK_API_KEY) {
  throw new Error('GROK_API_KEY missing from .env.local');
}

// Supabase client for storing splits (use service key for server actions)
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);

export async function parseFilesAction(fileUrls: string[], subphase?: string, userId?: string) {
  const results: (ParsedContract | { splits: string[] })[] = []; // Flexible return for subphases

  // Dynamic prompt composer based on subphase
  let promptComposer;
  let model = 'grok-4'; // Default to heavy for splitting/inference
  if (subphase === 'split') {
    promptComposer = composeSplitPrompt;
  } else if (subphase === 'essentials') {
    promptComposer = composeEssentialsPrompt;
    model = 'grok-4-1-fast-non-reasoning'; // Switch to fast for lighter tasks
  } else if (subphase === 'risks') {
    promptComposer = composeRiskPrompt;
    model = 'grok-4-1-fast-non-reasoning';
  } else {
    throw new Error('Invalid subphase');
  }

  for (const url of fileUrls) {
    try {
      // Fetch PDF buffer
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
      const buffer = await response.arrayBuffer();

      if (subphase === 'split') {
        // Hybrid: Grok 4 for section detection (scan text to get ranges, no storage)
        const pdfData = await pdf(buffer);
        const text = pdfData.text; // Full text scan for headings (lightweight)

        // NEW: Aggressive chunking to stay under 256k limit (aim for 128k per chunk max, tighter ratio)
        const maxTokens = 128000; // Halved for safety buffer
        const avgTokenPerChar = 0.25; // Adjust to 4 chars/token for conservatism
        const maxChars = Math.floor(maxTokens / avgTokenPerChar);
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += maxChars) {
          chunks.push(text.slice(i, i + maxChars));
        }

        console.log('Chunk count for large PDF:', chunks.length); // Debug: Check if chunking applied

        const sectionRanges: SectionRanges = {};

        // Process chunks sequentially with Grok 4
        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
          const chunkText = chunks[chunkIndex];
          console.log('Processing chunk', chunkIndex + 1, 'length:', chunkText.length); // Debug token estimate

          const completion = await grok.chat.completions.create({
            messages: [{ role: 'user', content: promptComposer(chunkText) }],
            model, // Grok 4 heavy
            temperature: 0.3,
            max_tokens: 1024,
          });

          const rawContent = completion.choices[0]?.message?.content || '';
          const cleanedContent = rawContent.trim().replace(/```json|```/g, ''); // Clean

          const chunkRanges: SectionRanges = JSON.parse(cleanedContent);

          // Adjust ranges for chunk offset (estimate page offset based on chunk size; refine if needed)
          const approxPagesPerChunk = pdfData.numpages / chunks.length;
          const offset = chunkIndex * approxPagesPerChunk;
          for (const [section, range] of Object.entries(chunkRanges)) {
            const [start, end] = range.split('-').map(Number);
            const adjustedStart = Math.round(start + offset);
            const adjustedEnd = Math.round(end + offset);
            sectionRanges[section] = `${adjustedStart}-${adjustedEnd}`;
          }
        }

        // Use pdf-lib to split based on ranges
        const originalPdf = await PDFDocument.load(buffer);
        const splitUrls: string[] = [];

        for (const [section, range] of Object.entries(sectionRanges)) {
          const [start, end] = range.split('-').map(Number);
          const subPdf = await PDFDocument.create();

          const pages = await subPdf.copyPages(originalPdf, Array.from({ length: end - start + 1 }, (_, i) => start + i - 1));
          pages.forEach(page => subPdf.addPage(page));

          const subPdfBytes = await subPdf.save();

          // Store in Supabase (e.g., jobs/user_<uid>/sections/section-name.pdf)
          const path = `jobs/user_${userId}/sections/${section}.pdf`;
          const { error } = await supabase.storage.from('enki-storage').upload(path, subPdfBytes, { contentType: 'application/pdf' });
          if (error) throw error;

          const { data: { publicUrl } } = supabase.storage.from('enki-storage').getPublicUrl(path);
          splitUrls.push(publicUrl); // Return URLs for review/one-click
        }

        results.push({ splits: splitUrls });

      } else {
        // Other subphases (essentials/risks) - revert to text-based parse with fast model
        let text = '';
        const pagesText: string[] = []; // Collect per-page

        const options: pdf.Options = {
          pagerender: async (pageData) => {
            const renderContext = {
              canvasContext: { fillText: () => {} }, // Mock
              viewport: pageData.getViewport({ scale: 1 }),
            };
            const textContent = await pageData.getTextContent(renderContext);
            const pageText = textContent.items.map((item: { str: string }) => item.str).join(' '); // FIXED: Type item as { str: string } to avoid any
            pagesText.push(pageText);
            return pageText;
          },
        };

        const pdfData = await pdf(buffer, options);
        await Promise.all(pagesText.map(p => p)); // Wait async

        text = pdfData.text; // Full for essentials/risks (or filter by ranges if provided)

        const completion = await grok.chat.completions.create({
          messages: [{ role: 'user', content: promptComposer(text) }],
          model, // Fast for lighter
          temperature: 0.3,
          max_tokens: 4096,
        });

        const rawContent = completion.choices[0]?.message?.content || '';
        const cleanedContent = rawContent.trim().replace(/```json|```/g, '');

        const rawParsed: Record<string, unknown> = JSON.parse(cleanedContent);

        const parsed: ParsedContract = {
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
        };

        // Handle "Null" as null
        for (const key in parsed) {
          if (parsed[key as keyof ParsedContract] === "Null") {
            parsed[key as keyof ParsedContract] = null;
          }
        }

        results.push(parsed);
      }

    } catch (error) {
      console.error('Grok parse error:', error);
      results.push(subphase === 'split' ? { splits: [] } : { contract_number: null, /* ... */ risks: [] });
    }
  }

  return results;
}