// lib/ai-actions/ai-calls.ts (UPDATED: Removed risks; only essentials/splits for Phase 1 parse)
'use server'; // Enforce server-only

import OpenAI from 'openai';
import { composeEssentialsPrompt } from '@/lib/prompts/phase1a/essentials';
import { composeSplitPrompt } from '@/lib/prompts/phase1a/split-prompts';

console.log('GROK_API_KEY:', process.env.GROK_API_KEY ? 'Set (length: ' + process.env.GROK_API_KEY.length + ')' : 'Undefined'); // Now logs server-side only
const openai = new OpenAI({ 
  apiKey: process.env.GROK_API_KEY, 
  baseURL: 'https://api.x.ai/v1/',
});

// NEW: Helper to chunk text (approx 50k tokens; rough split by paragraphs/pages)
function chunkText(text: string, maxTokensPerChunk: number = 50000): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  const lines = text.split('\n'); // Split by lines for natural breaks (e.g., PDF pages)
  for (const line of lines) {
    if (currentChunk.length + line.length > maxTokensPerChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += line + '\n';
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

// NEW: Simple sanitizer for Grok response (fixes common JSON issues like trailing commas or unescaped quotes)
function sanitizeJson(raw: string): string {
  return raw
    .replace(/,\s*([\]}])/g, '$1') // Remove trailing commas
    .replace(/\\(?!["\\])/g, '\\\\') // Escape unescaped backslashes
    .trim(); // Trim whitespace
}

interface ParsedContract { // Partial for essentials
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

export async function callAiForEssentials(text: string): Promise<ParsedContract> {
  const chunks = chunkText(text);
  let merged: ParsedContract = {
    contract_number: null, contract_amount: null, constructor_name: null, constructor_address: null,
    project_name: null, project_address: null, owner_name: null, owner_address: null,
    architect_name: null, architect_address: null, scope_of_work: null
  };

  for (const chunk of chunks) {
    const prompt = composeEssentialsPrompt(chunk);
    const completion = await openai.chat.completions.create({
      model: 'grok-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.1,
    });
    let partial;
    const rawContent = completion.choices[0].message.content!;
    try {
      partial = JSON.parse(sanitizeJson(rawContent)) as ParsedContract;
    } catch (jsonErr) {
      console.error('Grok JSON parse failed for essentials:', jsonErr, 'Raw:', rawContent);
      // Retry with strict prompt
      const retryPrompt = `${prompt}\n\nPrevious output malformed—respond with strict valid JSON only, no extra text.`;
      const retryCompletion = await openai.chat.completions.create({
        model: 'grok-4',
        messages: [{ role: 'user', content: retryPrompt }],
        max_tokens: 200,
        temperature: 0.1,
      });
      partial = JSON.parse(sanitizeJson(retryCompletion.choices[0].message.content!)) as ParsedContract;
    }
    // Merge: Prioritize non-null values
    Object.entries(partial).forEach(([key, value]) => {
      if (value !== null && merged[key as keyof ParsedContract] === null) {
        merged[key as keyof ParsedContract] = value;
      }
    });
  }
  return merged;
}

interface ParsedSplit {
  [section: string]: string; // e.g., { "schedule": "156-160" }
}

export async function callAiForSplits(text: string): Promise<ParsedSplit> {
  const chunks = chunkText(text);
  const merged: ParsedSplit = {};

  for (const chunk of chunks) {
    const prompt = composeSplitPrompt(chunk);
    const completion = await openai.chat.completions.create({
      model: 'grok-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.1,
    });
    let partial;
    const rawContent = completion.choices[0].message.content!;
    try {
      partial = JSON.parse(sanitizeJson(rawContent)) as ParsedSplit;
    } catch (jsonErr) {
      console.error('Grok JSON parse failed for splits:', jsonErr, 'Raw:', rawContent);
      const retryPrompt = `${prompt}\n\nPrevious output malformed—respond with strict valid JSON only, no extra text.`;
      const retryCompletion = await openai.chat.completions.create({
        model: 'grok-4',
        messages: [{ role: 'user', content: retryPrompt }],
        max_tokens: 300,
        temperature: 0.1,
      });
      partial = JSON.parse(sanitizeJson(retryCompletion.choices[0].message.content!)) as ParsedSplit;
    }
    Object.assign(merged, partial); // Merge sections (overwrite if dupes)
  }
  return merged;
}