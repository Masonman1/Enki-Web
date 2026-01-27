// lib/ai-actions/ai-calls.ts (updated init with bypass)

'use server'; // NEW: Enforce server-only

import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { composeEssentialsPrompt } from '@/lib/prompts/phase1a/essentials';
import { composeSplitPrompt } from '@/lib/prompts/phase1a/split-prompts';
import { composeRiskPrompt, flattenRisks } from '@/lib/prompts/phase1a/risk-prompts';

console.log('GROK_API_KEY:', process.env.GROK_API_KEY ? 'Set (length: ' + process.env.GROK_API_KEY.length + ')' : 'Undefined'); // Now logs server-side only
const openai = new OpenAI({ 
  apiKey: process.env.GROK_API_KEY, 
  baseURL: 'https://api.x.ai/v1/',
});

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

interface ParsedSplit {
  [section: string]: string; // e.g., { "schedule": "156-160" }
}

export async function callAiForEssentials(text: string): Promise<ParsedContract> {
  const prompt = composeEssentialsPrompt(text);
  const completion = await openai.chat.completions.create({
    model: 'grok-4', // Enki's model
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 500,
    temperature: 0.2,
  });
  const rawParsed = JSON.parse(completion.choices[0].message.content!);
  // Handle "Null" as null (as in original)
  for (const key in rawParsed) {
    if (rawParsed[key] === "Null") rawParsed[key] = null;
  }
  return rawParsed as ParsedContract;
}

export async function callAiForSplits(text: string): Promise<ParsedSplit> {
  const prompt = composeSplitPrompt(text);
  const completion = await openai.chat.completions.create({
    model: 'grok-4',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.1,
  });
  return JSON.parse(completion.choices[0].message.content!) as ParsedSplit;
}

export async function callAiForRisks(splitBuffers: Record<string, Buffer>): Promise<string[]> {
  const allRisks: string[] = [];
  for (const [section, buffer] of Object.entries(splitBuffers)) {
    try {
      const { text } = await pdf(buffer); // Now imported
      const prompt = composeRiskPrompt(text);
      const completion = await openai.chat.completions.create({
        model: 'grok-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
        temperature: 0.3,
      });
      const rawRisks = JSON.parse(completion.choices[0].message.content!);
      allRisks.push(...flattenRisks(rawRisks));
} catch (riskErr) {
      console.error(`Risk parse error for ${section}:`, riskErr);
    }
  }
  return allRisks;
}