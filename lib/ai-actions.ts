'use server'; // Server-only

import OpenAI from 'openai';

// Initialize Grok client server-side
const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

if (!process.env.GROK_API_KEY) {
  throw new Error('GROK_API_KEY missing from .env.local');
}

export async function parseFilesAction(fileUrls: string[], focus: string = 'default') {
  const results: any[] = [];

  for (const url of fileUrls) {
    try {
      // Fetch PDF from signed URL
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      const buffer = await response.arrayBuffer();

      // Upload to Grok Files API
      const file = new File([buffer], 'document.pdf', { type: 'application/pdf' });
      const uploadedFile = await grok.files.create({
        file,
        purpose: 'attachments',
      });
      const file_id = uploadedFile.id;

      // Tailored prompt for parsing
      let prompt = `Parse this ${focus} document for waterproofing subcontractor risks/misses. Focus on: substrate mismatches, VOC compliance (per jurisdiction like CA), sequencing dependencies, lead times >4wks, rate consistency, stock issues. Return structured JSON only: {"risks": array of strings`;

      if (focus === 'pds') {
        prompt += `, "extractedData": array of {"manufacturer": string, "name": string, "voc_level": number, "compatibility": array of strings, "lead_time_avg": number weeks}}`;
      } else {
        prompt += `, "extractedData": {"manufacturer": string, "name": string, "voc_level": number, "compatibility": array of strings, "lead_time_avg": number}}`;
      }

      switch (focus) {
        case 'setup':
          prompt += '. Emphasize substrate/VOC risks for pre-award/job setup.';
          break;
        case 'procurement':
          prompt += '. Emphasize lead times/stock for procurement.';
          break;
        case 'invoice':
          prompt += '. Emphasize rate mismatches/unapproved extras for invoice review.';
          break;
        case 'closeout':
          prompt += '. Emphasize incomplete warranties/punch resolutions for closeout.';
          break;
        case 'change-order':
          prompt += '. Emphasize scope changes/sequencing for change orders.';
          break;
        case 'pds':
          prompt += '. Extract structured PDS details for spec matching.';
          break;
        case 'kickoff':
          prompt += '. Emphasize SSSP misses/RFI needs for kickoff.';
          break;
        case 'submittals':
          prompt += '. Emphasize mismatches/warranties for submittals.';
          break;
        case 'scheduling':
          prompt += '. Emphasize sequencing/delays for scheduling.';
          break;
        default:
          prompt += '. General waterproofing risks.';
      }

      const completion = await grok.chat.completions.create({
        model: 'grok-4-1-fast-non-reasoning',
        messages: [
          {
            role: 'user',
            content: prompt,
            attachments: [{ type: 'file', file: { id: file_id } }],
          },
        ],
        max_tokens: 500,
        temperature: 0.5,
      });

      const responseContent = completion.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(responseContent);
      results.push(parsed);

    } catch (error) {
      console.error('Grok parse error:', error);
      results.push({ risks: ['Error parsing file: ' + (error as Error).message] });
    }
  }

  if (focus === 'pds') {
    return results.flatMap(result => result.extractedData || []);
  }
  return results.flatMap(result => result.risks || []);
}