// lib/prompts/1a-prompts.ts
// Extracted verbatim from lib/ai-actions.ts for Phase 1A: Pre-Bid Subcontract Essentials + Risks
// Granular modules with variants/examples to handle Grok inference issues (e.g., subcontract numbering quirks)

export const subcontractNumberModule = `
Extract contract_number: string or null.
Look for variants like "Subcontract Number", "Subcontract #", "Subcontract No:", "Agreement Number", "Contract ID", "PO Number", "SUBCONTRACT NO:", etc. (case-insensitive).
Examples:
- "Subcontract Number: SR-039" → "SR-039"
- "PO 1325.50102003" → "1325.50102003"
- "SUBCONTRACT NO: 710123.7920" → "710123.7920"
- If missing, null.
`;

export const contractAmountModule = `
Extract contract_amount: number or null.
Parse numeric value from "Contract Sum", "Subcontract Amount", "Total Price", "SUBCONTRACT AMOUNT:", etc. (case-insensitive). Remove commas/dollars, keep decimals if present.
Examples:
- "$1,234,567.89" → 1234567.89
- "SUBCONTRACT AMOUNT: $ 42,000.00" → 42000
- If missing, null.
`;

export const constructorNameModule = `
Extract constructor_name: string or null.
Look for "General Contractor", "Constructor", "GC Name", "CONTRACTOR:", etc. (case-insensitive).
Examples:
- "CONTRACTOR: CHOATE CONSTRUCTION COMPANY" → "CHOATE CONSTRUCTION COMPANY"
- If missing, null.
`;

export const constructorAddressModule = `
Extract constructor_address: string or null.
Full address from GC details, e.g., under "DIVISION OFFICE:", "ADDRESS:", or following contractor name. Concatenate multi-line if needed.
Examples:
- "DIVISION OFFICE: MOUNT PLEASANT ADDRESS: 235 MAGRATH DARBY BLVD., SUITE 250 MOUNT PLEASANT, SC 29464" → "235 MAGRATH DARBY BLVD., SUITE 250 MOUNT PLEASANT, SC 29464"
- If missing, null.
`;

export const projectNameModule = `
Extract project_name: string or null.
Look for variants like "Project Name", "Project Title", "Job Name", "PROJECT:", etc. (case-insensitive).
Examples:
- "PROJECT: BLDG 1 - PALMETTO COAST INDUSTRIAL PARK" → "BLDG 1 - PALMETTO COAST INDUSTRIAL PARK"
- If missing, null.
`;

export const projectAddressModule = `
Extract project_address: string or null.
Full address from project details, e.g., under "PROJECT:" or following project name. Concatenate if split.
Examples:
- "8651 WATER TOWER ROAD NORTH MYRTLE BEACH, SC 29568" → "8651 WATER TOWER ROAD NORTH MYRTLE BEACH, SC 29568"
- If missing, null.
`;

export const ownerNameModule = `
Extract owner_name: string or null.
Look for "Owner", "Client", "OWNER:", etc. (case-insensitive).
Examples:
- "OWNER: PCIP 1 PARTNERS, LLC" → "PCIP 1 PARTNERS, LLC"
- If missing, null.
`;

export const ownerAddressModule = `
Extract owner_address: string or null.
Full address from owner details, e.g., following "OWNER:".
Examples:
- "3105 GLENWOOD AVE., SUITE 105 RALEIGH, NC 27612" → "3105 GLENWOOD AVE., SUITE 105 RALEIGH, NC 27612"
- If missing, null.
`;

export const architectNameModule = `
Extract architect_name: string or null.
Look for "Architect", "Engineer", "ARCHITECT/ENGINEER:", etc. (case-insensitive).
Examples:
- "ARCHITECT/ENGINEER: WGM DESIGN, LLP" → "WGM DESIGN, LLP"
- If missing, null.
`;

export const architectAddressModule = `
Extract architect_address: string or null.
Full address from architect details, e.g., following "ARCHITECT/ENGINEER:".
Examples:
- "2907 PROVIDENCE ROAD, SUITE 304 CHARLOTTE, NC 28211" → "2907 PROVIDENCE ROAD, SUITE 304 CHARLOTTE, NC 28211"
- If missing, null.
`;

export const scopeOfWorkModule = `
Extract scope_of_work: string or null.
Summarize from "Scope of Work", "Work", "SCOPE OF WORK ("Work"):", etc. (case-insensitive). Focus on waterproofing-specific details like joint sealing, caulking, substrates.
Examples:
- "SCOPE OF WORK ("Work"): JOINT SEAL / CAULKING" → "Joint seal/caulking for BLDG 1 - Palmetto Coast Industrial Park. Waterproofing scope limited to sealant application on joints."
- If missing, null.
`;

export const risksModule = `
Extract risks: string[].
List key risks/misses in subcontract, e.g., payment terms, delays, waterproofing gaps (substrates, sequencing, lead times).
`;

export const risksMissesModule = `
Extract risks_misses: { risks: string[], misses: string[], documentation_gaps: string[] }.
Deeper analysis of general risks and misses.
`;

export const waterproofingSpecificRisksMissesModule = `
Extract waterproofing_specific_risks_misses: { risks: string[], misses: string[] }.
Waterproofing-focused risks (e.g., material compatibility, VOC compliance).
`;

export const outputFormat = `
Output ONLY valid JSON:
{
  "contract_number": string|null,
  "contract_amount": number|null,
  "constructor_name": string|null,
  "constructor_address": string|null,
  "project_name": string|null,
  "project_address": string|null,
  "owner_name": string|null,
  "owner_address": string|null,
  "architect_name": string|null,
  "architect_address": string|null,
  "scope_of_work": string|null,
  "risks": string[],
  "risks_misses": { "risks": string[], "misses": string[], "documentation_gaps": string[] },
  "waterproofing_specific_risks_misses": { "risks": string[], "misses": string[] }
}
`;

// Composer (dynamic build, as in original)
export const composePhase1aPrompt = (text: string) => `
You are an expert waterproofing subcontractor PM. Extract case-insensitively and handle common contract formats (e.g., uppercase labels with colons).

${subcontractNumberModule}
${contractAmountModule}
${constructorNameModule}
${constructorAddressModule}
${projectNameModule}
${projectAddressModule}
${ownerNameModule}
${ownerAddressModule}
${architectNameModule}
${architectAddressModule}
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