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

export async function parseFilesAction(fileUrls: string[], focus: string = 'default'): Promise<ParsedContract[]> {
  const results: ParsedContract[] = [];

  for (const url of fileUrls) {
    try {
      // Fetch PDF from signed URL (unchanged)
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      const buffer = await response.arrayBuffer();
      const data = await pdf(Buffer.from(buffer)); // Extract text reliably
      const text = data.text; // Clean extracted text

      // NEW: Phase-specific prompt composition (extensible for other focuses/phases)
      let prompt = '';
      let risksFlattener = () => []; // Default fallback (no param needed for empty array)
      if (focus === 'phase1a' || focus === 'prebid' || focus === 'default') { // Phase 1A default
        prompt = composePhase1aPrompt(text); // Uses extracted modules
        risksFlattener = flattenRisks; // Phase-specific flattener
      } else {
        // Stub for future phases (e.g., if focus === 'phase1b', import from 1b-prompts.ts)
        throw new Error(`Unsupported focus: ${focus} – Add phase-specific prompts`);
      }

      // Call Grok (unchanged)
      const completion = await grok.chat.completions.create({
        model: 'grok-4-1-fast-non-reasoning',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1, // Low for structured output
        max_tokens: 2000,
      });

      const responseContent = completion.choices[0]?.message?.content || '{}';

      // Response cleaning (add if needed; e.g., strip markdown as in prior chats)
      const cleanedContent = responseContent
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();

      let rawParsed: Record<string, unknown>;
      try {
        rawParsed = JSON.parse(cleanedContent);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError, 'Raw:', cleanedContent);
        rawParsed = {};
      }

      // Flatten risks using phase-specific logic (unchanged logic, now imported)
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