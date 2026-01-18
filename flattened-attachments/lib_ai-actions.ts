'use server'; // Server-only

import OpenAI from 'openai';
import pdf from 'pdf-parse'; // For reliable text extraction

// Define interfaces for structured parsing
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

// Initialize Grok client server-side
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
      // Fetch PDF from signed URL
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      const buffer = await response.arrayBuffer();

      // Pre-extract text with pdf-parse for reliability
      let extractedText = '';
      try {
        const pdfData = await pdf(buffer);
        extractedText = pdfData.text.trim(); // Clean up whitespace
        console.log('Extracted PDF text (first 500 chars):', extractedText.substring(0, 500)); // Debug log
      } catch (extractError) {
        console.error('PDF text extraction failed:', extractError);
      }

      // Upload to Grok Files API (keep for OCR/layout)
      const file = new File([buffer], 'document.pdf', { type: 'application/pdf' });
      const uploadedFile = await grok.files.create({
        file,
        purpose: 'attachments',
      });
      const file_id = uploadedFile.id;

      // Modular prompt construction: Base + field modules for easy refinement
      let baseInstructions = `Parse this document for contract essentials and waterproofing-specific risks/misses. Return structured JSON only.`;

      // Add focus-specific refinements (extendable for other phases)
      if (focus === 'essentials') {
        baseInstructions += ` Focus on essentials: contract_number, parties (constructor/owner/architect names/addresses), project_name/address, scope_of_work. Set null for missing.`;
      } else if (focus === 'risks') {
        baseInstructions += ` Focus on risks: array of strings for VOC, substrates, sequencing, lead times, slop/riders. Include reasoning.`;
      } else if (focus === 'submittals') {
        baseInstructions += ` Focus on submittals: risks like warranty notes, manufacturer mismatches, VOC compliance.`;
      }

      const prompt = `${baseInstructions} Extracted text (use as fallback if attachment OCR fails): ${extractedText.substring(0, 2000)}`; // Truncate to avoid token limits

      const completion = await grok.chat.completions.create({
        model: 'grok-beta',
        tools: [{ type: 'file_search' }],
        tool_choice: 'required',
        messages: [
          {
            role: 'user',
            content: prompt,
            attachments: [{ type: 'file', file: { id: file_id } }],
          },
        ],
        max_tokens: 700, // Increased for risks reasoning
        temperature: 0.4, // Lower for conservative detection
      });

      const responseContent = completion.choices[0]?.message?.content || '{}';
      console.log('Raw Grok response:', responseContent); // Debug: Check this in terminal
      let parsed: ParsedContract;
      try {
        parsed = JSON.parse(responseContent);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError, 'Raw:', responseContent);
        parsed = { contract_number: null, contract_amount: null, constructor_name: null, constructor_address: null, project_name: null, project_address: null, owner_name: null, owner_address: null, architect_name: null, architect_address: null, scope_of_work: null, risks: [] };
      }
      results.push(parsed);

    } catch (error) {
      console.error('Grok parse error:', error);
      results.push({ contract_number: null, contract_amount: null, constructor_name: null, constructor_address: null, project_name: null, project_address: null, owner_name: null, owner_address: null, architect_name: null, architect_address: null, scope_of_work: null, risks: [] });
    }
  }

  return results; // Array of ParsedContract
}