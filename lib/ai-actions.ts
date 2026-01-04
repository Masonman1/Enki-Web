'use server'; // Server-only

import OpenAI from 'openai';
import pdf from 'pdf-parse'; // For reliable text extraction

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
      let baseInstructions = `Parse this document for contract essentials and waterproofing-specific risks/misses. Return structured JSON only: {fields}. Use "Null" if not found. Infer from context if ambiguous, and prioritize values near headers or "subcontract" mentions.`;

      // Subcontract number module (refined with PO fallback)
      const subcontractNumberModule = `
Search case-insensitively for variations like "Subcontract Number", "Sub No", "Contract No", "SC Number", "Agreement ID", "Sub ID", "SUBCONTRACT #", or similar. If no subcontract-specific number is found, fallback to purchase order variations like "PO", "Purchase Order", "PO No", "PO Number", "P.O.", or "PO:" as the identifier, particularly in top-right headers or standalone codes. Extract the alphanumeric value nearby (e.g., after colon, space, #, or in table/header). If ambiguous, infer from context (e.g., code near "subcontract", "agreement", or "PO"). Use "Null" if neither found.
Examples:
- "Subcontract Number: SR-039" → "SR-039"
- "Contractor Job Number: ... Subcontract Number: SR-039" → "SR-039" (ignore prefixes)
- "Sub No. ABC-123" → "ABC-123"
- "Contract ID: 456DEF" → "456DEF"
- "SC# 789-GHI" → "789-GHI"
- "in the Subcontract 2023-001" (no label) → "2023-001"
- "PO 1325.50102003" → "1325.50102003"
- "Purchase Order No.: PO-45678" → "PO-45678"
- "P.O. # XYZ-999" → "XYZ-999"
- "PO: 7181-017" → "7181-017"
- "P.O. 071000 -" → "071000"
- "SUBCONTRACT # 21161 TKC 46629" → "21161 TKC 46629" (handle multi-part with spaces/#)
- "SUBCONTRACT NO. 71012.7920" → "71012.7920"
Field: "contract_number": string or "Null"`;

      // Contract amount module (parses numeric/worded, converts to number)
      const contractAmountModule = `
Search case-insensitively for variations like "Contract Amount", "Subcontract Amount", "Amount", "Sum", "Price", or similar. Extract the value, converting to a plain number (remove $, commas; parse worded like "Forty-Four Thousand" to numeric). If worded and numeric differ, prioritize numeric. Use null if not found.
Examples:
- "Contract Amount: $44,875.00" → 44875
- "Amount: $42,000.00 – Forty-Two Thousand Dollars" → 42000
- "Subcontract Sum: Forty-Four Thousand Eight Hundred Seventy-Five and 00/100 Dollars" → 44875
- "Price: 2023.50" → 2023.5
Field: "contract_amount": number or null`;

      // Constructor (contractor) name and address module
      const constructorModule = `
Search case-insensitively for the contractor (or constructor/general contractor/GC) name and address. Look for labels like "CONTRACTOR:", "Constructor:", "Between:", "GC:", or the first party in "BETWEEN [Name] AND [Subcontractor]". Extract the full legal name and address (street, city, state, zip; combine multi-line if needed). Use "Null" if not found.
Examples:
- "CONTRACTOR: CHOATE CONSTRUCTION COMPANY ... ADDRESS: 235 MAGRATH DARBY BLVD., SUITE 250 MOUNT PLEASANT, SC 29464" → name "CHOATE CONSTRUCTION COMPANY", address "235 MAGRATH DARBY BLVD., SUITE 250, MOUNT PLEASANT, SC 29464"
- "BETWEEN: NWR CONSTRUCTION LLC (hereinafter “Contractor”) 558 E. Brooklyn Village Avenue, Suite 120 Charlotte, NC 28202" → name "NWR CONSTRUCTION LLC", address "558 E. Brooklyn Village Avenue, Suite 120, Charlotte, NC 28202"
- "Contractor: Western Waterproofing Company of America dba Western Specialty Contractors ... address: 2500 Allen Road S Charlotte, North Carolina 28269" → name "Western Waterproofing Company of America dba Western Specialty Contractors", address "2500 Allen Road S, Charlotte, North Carolina 28269"
Field: "constructor_name": string or "Null", "constructor_address": string or "Null"`;

      // Project name and address module
      const projectModule = `
Search case-insensitively for the project name and address. Look for labels like "PROJECT:", "Project Name:", "Site:", "Location:", or descriptions near "at [Address]" or "for [Project Title]". Extract the full project title and address (street, city, state, zip; combine if multi-line). Use "Null" if not found.
Examples:
- "PROJECT: BLDG 1 - PALMETTO COAST INDUSTRIAL PARK ADDRESS: 8651 WATER TOWER ROAD NORTH MYRTLE BEACH, SC 29468" → name "BLDG 1 - PALMETTO COAST INDUSTRIAL PARK", address "8651 WATER TOWER ROAD, NORTH MYRTLE BEACH, SC 29468"
- "Project: Gateway Village 800 Building Sealant Replacement" → name "Gateway Village 800 Building Sealant Replacement", address "Null" (if no address)
- "SUNRISE APARTMENTS" (header) → name "SUNRISE APARTMENTS", address "Null"
Field: "project_name": string or "Null", "project_address": string or "Null"`;

      // Owner name and address module
      const ownerModule = `
Search case-insensitively for the owner name and address. Look for labels like "OWNER:", "Owner:", "Client:", or the party in "for [Owner]" or "BETWEEN ... AND [Subcontractor] for [Owner]". Extract the full legal name and address (street, city, state, zip; combine multi-line if needed). Use "Null" if not found or ambiguous.
Examples:
- "OWNER: PCIP 1 PARTNERS, LLC ADDRESS: 3105 GLENWOOD AVE., SUITE 105 RALEIGH, NC 27612" → name "PCIP 1 PARTNERS, LLC", address "3105 GLENWOOD AVE., SUITE 105, RALEIGH, NC 27612"
- "Owner: Owner Corp, 789 Oak Ave, Village, CA" → name "Owner Corp", address "789 Oak Ave, Village, CA"
- "for the Owner referred to above" (no explicit) → "Null"
Field: "owner_name": string or "Null", "owner_address": string or "Null"`;

      // Architect name and address module
      const architectModule = `
Search case-insensitively for the architect (or design professional/engineer/AE) name and address. Look for labels like "ARCHITECT:", "Architect/Engineer:", "Design Professional:", or descriptions near "ARCHITECT" or "ENGINEER". Extract the full legal name and address (street, city, state, zip; combine multi-line if needed). Use "Null" if not found, as this is often missing.
Examples:
- "ARCHITECT/ENGINEER: WGM DESIGN, LLP ADDRESS: 2907 PROVIDENCE ROAD, SUITE 304 CHARLOTTE, NC 28211" → name "WGM DESIGN, LLP", address "2907 PROVIDENCE ROAD, SUITE 304, CHARLOTTE, NC 28211"
- "Architect: Design Firm, 101 Pine Rd, Hamlet, CA" → name "Design Firm", address "101 Pine Rd, Hamlet, CA"
- If no mention (common in some contracts) → "Null"
Field: "architect_name": string or "Null", "architect_address": string or "Null"`;

      // Scope of work module (set "Null" if not simple bullet/table list)
      const scopeModule = `
Search case-insensitively for the scope of work description. Look for labels like "SCOPE OF WORK:", "Work:", "Description of Work:", or sections describing the subcontractor's tasks (e.g., near "perform certain labor" or "labor and materials"). If structured as a simple bullet list or 2-column table of tasks, summarize the waterproofing-specific scope in a concise string (e.g., "Joint seal/caulking on building substrates; Air Barrier: Fluid-applied membrane"). If vague, reference-only (e.g., "Division 07" or "rider attached" without explicit list/table), or not a list/table, set to "Null". Use "Null" if not found.
Examples:
- Bullet list: "- Joint seal / caulking - Air Barrier installation" → "Joint seal / caulking; Air Barrier installation"
- 2-column table: "Air Barrier | Fluid-applied membrane on substrates" → "Air Barrier: Fluid-applied membrane on substrates"
- "to perform certain labor and furnish certain materials at [Project]" (vague, no list/table) → "Null"
- "Referenced Specification Sections: DIVISION 07" (slop) → "Null"
Field: "scope_of_work": string or "Null"`;

      // Simplified risks module (single warning for slop if scope "Null")
      const risksModule = `
If scope_of_work is "Null", return risks as ["Scope ambiguous—confirm details from rider/specs"]. Otherwise, return [].
Field: "risks": array of strings (single warning or empty)`;

      // Dynamically build prompt (add more modules as we expand)
      let prompt = baseInstructions;
      let jsonFields = '';

      if (focus === 'pre-award-essentials') {
        prompt += subcontractNumberModule;
        jsonFields += '"contract_number": string or "Null"';
        prompt += contractAmountModule;
        jsonFields += ', "contract_amount": number or null';
        prompt += constructorModule;
        jsonFields += ', "constructor_name": string or "Null", "constructor_address": string or "Null"';
        prompt += projectModule;
        jsonFields += ', "project_name": string or "Null", "project_address": string or "Null"';
        prompt += ownerModule;
        jsonFields += ', "owner_name": string or "Null", "owner_address": string or "Null"';
        prompt += architectModule;
        jsonFields += ', "architect_name": string or "Null", "architect_address": string or "Null"';
        prompt += scopeModule;
        jsonFields += ', "scope_of_work": string or "Null"';
        prompt += risksModule;
        jsonFields += ', "risks": array of strings';
      } else {
        // Placeholder for other focuses (e.g., 'pds' for structured data)
        prompt += `General parse for ${focus}. Return {"extractedData": {}}.`;
      }

      prompt = prompt.replace('{fields}', `{${jsonFields}}`); // Inject fields into base

      // Append extracted text
      if (extractedText) {
        prompt += `\n\nExtracted Document Text:\n${extractedText}`;
      }

      const completion = await grok.chat.completions.create({
        model: 'grok-4-1-fast-reasoning',
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
      let parsed;
      try {
        parsed = JSON.parse(responseContent);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError, 'Raw:', responseContent);
        parsed = { contract_number: 'Null', contract_amount: null, constructor_name: 'Null', constructor_address: 'Null', project_name: 'Null', project_address: 'Null', owner_name: 'Null', owner_address: 'Null', architect_name: 'Null', architect_address: 'Null', scope_of_work: 'Null', risks: [] };
      }
      results.push(parsed);

    } catch (error) {
      console.error('Grok parse error:', error);
      results.push({ contract_number: 'Null', contract_amount: null, constructor_name: 'Null', constructor_address: 'Null', project_name: 'Null', project_address: 'Null', owner_name: 'Null', owner_address: 'Null', architect_name: 'Null', architect_address: 'Null', scope_of_work: 'Null', risks: [] });
    }
  }

  return results; // Array of { contract_number: ..., contract_amount: ..., constructor_name: ..., constructor_address: ..., project_name: ..., project_address: ..., owner_name: ..., owner_address: ..., architect_name: ..., architect_address: ..., scope_of_work: ..., risks: ... }
}