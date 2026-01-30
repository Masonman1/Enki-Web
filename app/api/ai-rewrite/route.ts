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
  // Structured fields
  csi_code?: string;
  keywords?: string;
  title?: string;
  category?: string;
  threshold?: string;
  exclusions?: string;
  receipt_conditions?: string;
  details?: string;
  selected_standards?: string[]; // IDs; fetch names in prompt if needed
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RewriteBody;

    // Derive triggerContext and userContext from structured fields
    const triggerContext = `CSI: ${body.csi_code || ''}. Keywords: ${body.keywords || ''}. Category: ${body.category || ''}. Threshold: ${body.threshold || ''}.`;
    const userContext = `Title: ${body.title || ''}. Exclusions: ${body.exclusions || ''}. Receipt: ${body.receipt_conditions || ''}. Details: ${body.details || ''}. Standards: ${body.selected_standards?.join(', ') || 'none'}.`;

    const promptParams: ClausePromptParams = { triggerContext, userContext };
    const prompt = composeClausePrompt(promptParams);

    let parsedResponse;
    if (grokApiKey) {
      const completion = await openai.chat.completions.create({
        model: 'grok-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.1,
      });
      parsedResponse = JSON.parse(completion.choices[0].message.content!);
    } else {
      // Fallback mocks using structured fields
      parsedResponse = {
        clause_rewrite: `Exhibit: The General Contractor shall indemnify and hold harmless the Subcontractor from any and all claims, losses, or delays arising from ${userContext.toLowerCase() || 'unknown'}, pursuant to applicable building codes and subcontractor agreements. Subcontractor entitled to equitable adjustment for additional costs.`,
        suggested_name: body.title?.toLowerCase().replace(/\s+/g, '_').slice(0, 50) || 'unknown_trigger',
      };
    }

    // NEW: Build trigger_rewrite from structured fields
    const csi = body.csi_code || 'unknown';
    const keywordsList = body.keywords ? body.keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
    const keywordsCondition = keywordsList.length > 0 
      ? keywordsList.join("' OR scope_item contains '")
      : 'unknown';
    const trigger_rewrite = `CSI equals ${csi} AND scope_item contains '${keywordsCondition}'`;

    return NextResponse.json({
      trigger_rewrite,
      clause_rewrite: parsedResponse.clause_rewrite,
      suggested_name: parsedResponse.suggested_name,
    }, { status: 200 });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI rewrite error:', message);

    // Fallback using body if available
    const body = await req.json() as RewriteBody; // Re-parse if needed
    const csi = body.csi_code || 'unknown';
    const keywordsList = body.keywords ? body.keywords.split(',').map(k => k.trim()).filter(Boolean) : [];
    const keywordsCondition = keywordsList.length > 0 
      ? keywordsList.join("' OR scope_item contains '")
      : 'unknown';
    const trigger_rewrite = `CSI equals ${csi} AND scope_item contains '${keywordsCondition}'`;

    const clause_rewrite = `Exhibit: The General Contractor shall indemnify and hold harmless the Subcontractor from any and all claims, losses, or delays arising from unknown, pursuant to applicable building codes and subcontractor agreements. Subcontractor entitled to equitable adjustment for additional costs.`;
    const suggested_name = 'unknown_trigger';

    return NextResponse.json({ trigger_rewrite, clause_rewrite, suggested_name }, { status: 200 }); // Graceful degrade
  }
}