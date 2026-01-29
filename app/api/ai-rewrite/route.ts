// app/api/ai-rewrite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { composeClausePrompt, ClausePromptParams } from '@/lib/prompts/trigger-rewrite'; // Import the composer

const grokApiKey = process.env.GROK_API_KEY;
const grokBaseUrl = 'https://api.x.ai/v1/';

if (!grokApiKey) {
  console.error('GROK_API_KEY missing - fallback to mocks');
  // Optionally throw or handle for prod
}

const openai = new OpenAI({
  apiKey: grokApiKey,
  baseURL: grokBaseUrl,
});

interface RewriteBody {
  trigger_desc?: string;
  clause_desc?: string;
  // Optional future params: jurisdiction, csi_code, etc.
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RewriteBody;
    const { trigger_desc, clause_desc } = body;

    // Derive title and topic from clause_desc (stubs for MVP; PM can input directly in form later)
const title = "Substrate Receipt"; // Fixed neutral title — never used in output
const topic = "substrate receipt and preparation requirements"; 

const promptParams: ClausePromptParams = {
  triggerContext: trigger_desc || "Unknown trigger",
  userContext: clause_desc || "Unknown clause",
};

    const prompt = composeClausePrompt(promptParams);

    try {
      const completion = await openai.chat.completions.create({
        model: 'grok-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.2, // Low for structured output
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) throw new Error('Empty Grok response');

      const parsedResponse: { clause_rewrite: string } = JSON.parse(responseContent);

      // For full rewrite: Include trigger_rewrite and suggested_name (stubs or expand composer later)
      const trigger_rewrite = trigger_desc ? `CSI equals ${trigger_desc.match(/\d{6}/)?.[0] || 'unknown'} AND scope_item contains '${trigger_desc.split(' ').slice(-3).join(' ') || 'unknown'}'` : '';
      const suggested_name = trigger_desc?.toLowerCase().replace(/\s+/g, '_').slice(0, 50) || 'unknown_trigger';

      return NextResponse.json({ 
        trigger_rewrite, 
        clause_rewrite: parsedResponse.clause_rewrite, 
        suggested_name 
      });
    } catch (grokError: unknown) {
      console.error('Grok rewrite error:', grokError);
      // Fallback to original mock for resilience
      const trigger_rewrite = `CSI equals ${trigger_desc?.match(/\d{6}/)?.[0] || 'unknown'} AND scope_item contains '${trigger_desc?.split(' ').slice(-3).join(' ') || 'unknown'}'`;
      const clause_rewrite = `Exhibit: The General Contractor shall indemnify and hold harmless the Subcontractor from any and all claims, losses, or delays arising from ${clause_desc?.toLowerCase() || 'unknown'}, pursuant to applicable building codes and subcontractor agreements. Subcontractor entitled to equitable adjustment for additional costs.`;
      const suggested_name = trigger_desc?.toLowerCase().replace(/\s+/g, '_').slice(0, 50) || 'unknown_trigger';
      return NextResponse.json({ trigger_rewrite, clause_rewrite, suggested_name }, { status: 200 }); // Graceful degrade
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI rewrite error:', message);
    return NextResponse.json({ error: 'Rewrite failed' }, { status: 500 });
  }
}