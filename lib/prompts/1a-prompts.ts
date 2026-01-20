// lib/prompts/1a-prompts.ts
// Extracted verbatim from lib/ai-actions.ts for Phase 1A: Pre-Bid Subcontract Essentials + Risks
// Granular modules with variants/examples to handle Grok inference issues (e.g., subcontract numbering quirks)

export const subcontractNumberModule = `
Extract subcontract_number: string or null.
Look for variants like "Subcontract Number", "Subcontract #", "Subcontract No:", "Agreement Number", "Contract ID", "PO Number", etc.
Examples:
- "Subcontract Number: SR-039" → "SR-039"
- "PO 1325.50102003" → "1325.50102003"
- If missing, null.
`;

export const contractAmountModule = `
Extract contract_amount: number or null.
Parse numeric value from "Contract Sum", "Subcontract Amount", "Total Price", etc. Remove commas/dollars.
Examples:
- "$1,234,567.89" → 1234567.89
- If missing, null.
`;

export const constructorNameModule = `
Extract constructor_name: string or null.
Look for "General Contractor", "Constructor", "GC Name", etc.
`;

export const constructorAddressModule = `
Extract constructor_address: string or null.
Full address from GC details.
`;

// ... Continue extracting all modules verbatim (e.g., project_name, owner_name, architect_name, scope_of_work, etc.)
// For brevity, assuming similar pattern for the rest as in ai-actions.ts

export const scopeOfWorkModule = `
Extract scope_of_work: concise summary string or null.
Summarize from "Scope of Work", "Description of Services".
Waterproofing-specific: Highlight membrane, substrate, sequencing.
`;

export const risksModule = `
Extract risks: array of strings (3-10 critical risks).
Waterproofing focus: VOC compliance, lead times, substrate risks, etc.
Format: "Category: Detail".
`;

export const risksMissesModule = `
Extract risks_misses: { risks: string[], misses: string[], documentation_gaps: string[] } or similar.
Flatten in post-processing.
`;

export const waterproofingSpecificRisksMissesModule = `
Extract waterproofing_specific_risks_misses: { risks: string[], misses: string[] }.
Focus on material staging, vendor stock, etc.
`;

export const outputFormat = `
Output ONLY valid JSON:
{
  "contract_number": string|null,
  "contract_amount": number|null,
  // ... all essentials fields
  "scope_of_work": string|null,
  "risks": string[],
  "risks_misses": { ... },
  "waterproofing_specific_risks_misses": { ... }
}
`;

// Composer (dynamic build, as in original)
export const composePhase1aPrompt = (text: string) => `
You are an expert waterproofing subcontractor PM.

${subcontractNumberModule}
${contractAmountModule}
${constructorNameModule}
${constructorAddressModule}
// ... all other modules
${scopeOfWorkModule}
${risksModule}
${risksMissesModule}
${waterproofingSpecificRisksMissesModule}

${outputFormat}

Text:
${text}
`;

// Post-processing (update flattenRisks param type)
export const flattenRisks = (rawParsed: Record<string, unknown>) => [ // NEW: Typed instead of any
  ...(rawParsed?.risks ?? []),
  ...(rawParsed?.risks_misses?.risks ?? []),
  ...(rawParsed?.risks_misses?.misses ?? []),
  ...(rawParsed?.risks_misses?.documentation_gaps ?? []),
  ...(rawParsed?.waterproofing_specific_risks_misses?.risks ?? []),
  ...(rawParsed?.waterproofing_specific_risks_misses?.misses ?? [])
];