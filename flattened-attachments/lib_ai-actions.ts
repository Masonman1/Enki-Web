// lib/ai-actions.ts (refactored: Prompts extracted to phase-specific files for modularity)
'use server'; // Server-only (unchanged)

import OpenAI from 'openai';
import pdf from 'pdf-parse'; // For reliable text extraction

// NEW: Phase-specific imports (start with 1A; add 1B+ as needed)
import { composePhase1aPrompt, flattenRisks } from '@/lib/prompts/1a-prompts';

// Define interfaces for structured parsing (unchanged)
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

// Initialize Grok client server-side (unchanged)
// lib/ai-actions.ts (add at top of parseFilesAction or init)
console.log('GROK_API_KEY check:', process.env.GROK_API_KEY ? 'Set (length: ' + process.env.GROK_API_KEY.length + ')' : 'Missing!');
const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

if (!process.env.GROK_API_KEY) {
  throw new Error('GROK_API_KEY missing from .env.local');
}

export async function parseFilesAction(fileUrls: string[], focus: string = 'phase1a') {
  const results: ParsedContract[] = [];

  // Dynamic prompt composer (add more phases as implemented)
  const promptComposer = focus === 'phase1a' ? composePhase1aPrompt : composePhase1aPrompt; // Fallback to 1A; update for others
  // Add switches for other phases as implemented (e.g., if (focus === 'phase1b') promptComposer = composePhase1bPrompt;)

  for (const url of fileUrls) {
    try {
      // Fetch and parse PDF (unchanged)
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch error: ${response.status}`);
      const buffer = await response.arrayBuffer();
      const { text } = await pdf(Buffer.from(buffer));

      // Get completion from Grok
      const completion = await grok.chat.completions.create({
  messages: [{ role: 'user', content: promptComposer(text) }],
  model: 'grok-4-1-fast-non-reasoning',
  temperature: 0.3, // Low for structured output
  max_tokens: 4096,
});

const rawContent = completion.choices[0]?.message?.content || ''; // Changed to const

// NEW: Clean markdown wrappers if present (handles Grok's common formatting)
let cleanedContent = rawContent.trim();
if (cleanedContent.startsWith('```json') && cleanedContent.endsWith('```')) {
  cleanedContent = cleanedContent.slice(7, -3).trim(); // Remove ```json and trailing ```
} else if (cleanedContent.startsWith('```') && cleanedContent.endsWith('```')) {
  cleanedContent = cleanedContent.slice(3, -3).trim(); // Fallback for plain ```
}

let rawParsed: Record<string, unknown>; // Changed from any for stricter typing
try {
  rawParsed = JSON.parse(cleanedContent); // Use cleaned version
} catch (parseErr) {
  console.error('JSON parse error:', parseErr);
  rawParsed = {};
}

      const risksFlattener = flattenRisks; // Alias for clarity (imported)

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
        risks: risksFlattener(rawParsed), // Uses imported flattenRisks
      };

      // Handle "Null" strings as null for consistency (unchanged)
      for (const key in parsed) {
        if (parsed[key as keyof ParsedContract] === "Null") {
          parsed[key as keyof ParsedContract] = null;
        }
      }
      results.push(parsed);

    } catch (error) {
      console.error('Grok parse error:', error);
      results.push({ contract_number: null, contract_amount: null, constructor_name: null, constructor_address: null, project_name: null, project_address: null, owner_name: null, owner_address: null, architect_name: null, architect_address: null, scope_of_work: null, risks: [] });
    }
  }

  return results; // Array of ParsedContract
}