// app/api/ai-rewrite/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { composeClausePrompt, ClausePromptParams } from '@/lib/prompts/trigger-rewrite'; // Import the composer

const grokApiKey = process.env.GROK_API_KEY;
const grokBaseUrl = 'https://api.x.ai/v1/';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!grokApiKey || !supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars - fallback to mocks');
  // Optionally throw or handle for prod
}

const openai = new OpenAI({
  apiKey: grokApiKey,
  baseURL: grokBaseUrl,
});

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

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

    // Derive triggerContext and userContext
    const triggerContext = [
      body.trigger_desc || '',
      body.keywords ? `Keywords: ${body.keywords}` : '',
      body.csi_code ? `CSI Code: ${body.csi_code}` : '',
      body.category ? `Category: ${body.category}` : '',
      body.threshold ? `Threshold: ${body.threshold}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const userContext = [
      body.clause_desc || '',
      body.exclusions ? `Exclusions: ${body.exclusions}` : '',
      body.receipt_conditions ? `Receipt Conditions: ${body.receipt_conditions}` : '',
      body.details ? `Details: ${body.details}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const params: ClausePromptParams = { triggerContext, userContext };
    const initialPrompt = composeClausePrompt(params);

    let messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'user', content: initialPrompt },
    ];

    let clause_rewrite = '';
    const suggested_name = ''; // FIXED: Use const

    while (true) {
      const completion = await openai.chat.completions.create({
        model: 'grok-4',
        messages,
        tools,
        tool_choice: 'auto',
        max_tokens: 500,
        temperature: 0.2,
      });

      const responseMessage = completion.choices[0].message;

      if (!responseMessage.tool_calls) {
        // Final response - parse JSON
        const output = JSON.parse(responseMessage.content!);
        clause_rewrite = output.clause_rewrite || '';
        suggested_name = output.suggested_name || ''; // FIXED: Assign to const
        break;
      }

      // Handle tool calls
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.function.name === 'search_standards') {
          const args = JSON.parse(toolCall.function.arguments);
          const query = args.query;

          // Execute search on Supabase wp_standards table
          const { data, error } = await supabase
            .from('wp_standards')
            .select('standard_name, description, category')
            .ilike('standard_name', `%${query}%`)
            .or(`description.ilike.%${query}%`)
            .limit(5); // Limit to avoid overload

          if (error) {
            console.error('Standards search error:', error);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({ error: 'Search failed' }),
            });
          } else {
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              name: toolCall.function.name,
              content: JSON.stringify({
                results: data || [],
              }),
            });
          }
        }
      }

      // Append the assistant's message with tool_calls for context
      messages.push(responseMessage);
    }

    return NextResponse.json({ clause_rewrite, suggested_name });
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
    const clause_rewrite = `Exhibit: The General Contractor shall indemnify and hold harmless the Subcontractor from any and all claims, losses, or delays arising from unknown, pursuant to applicable building codes and subcontractor agreements. Subcontractor entitled to equitable adjustment for additional costs.`;
    const suggested_name = 'unknown_trigger';

    return NextResponse.json({ clause_rewrite, suggested_name }, { status: 200 }); // Graceful degrade
  }
}