// lib/prompts/phase1a/essentials.ts
// Extracted verbatim for Phase 1A essentials (e.g., contract_number, constructor_address)
// No changes—focus on case-insensitive extraction with examples

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
Look for "General Contractor", "Constructor", "GC Name", "Contractor:", etc. (case-insensitive).
Examples:
- "General Contractor: ABC Construction" → "ABC Construction"
- If missing, null.
`;

export const constructorAddressModule = `
Extract constructor_address: string or null.
Look for address near constructor name, like "Address:", "Location:", etc.
Examples:
- "123 Main St, City, ST 12345" → "123 Main St, City, ST 12345"
- If missing, null.
`;

export const projectNameModule = `
Extract project_name: string or null.
Look for "Project Name", "Job Title", "Project:", etc.
Examples:
- "Project: Greenway Gardens" → "Greenway Gardens"
- If missing, null.
`;

export const projectAddressModule = `
Extract project_address: string or null.
Look for address near project name.
Examples:
- "456 Elm St, Town, ST 67890" → "456 Elm St, Town, ST 67890"
- If missing, null.
`;

export const ownerNameModule = `
Extract owner_name: string or null.
Look for "Owner", "Client", "Owner Name:", etc.
Examples:
- "Owner: XYZ Properties" → "XYZ Properties"
- If missing, null.
`;

export const ownerAddressModule = `
Extract owner_address: string or null.
Look for address near owner name.
Examples:
- "789 Oak Ave, Village, ST 11223" → "789 Oak Ave, Village, ST 11223"
- If missing, null.
`;

export const architectNameModule = `
Extract architect_name: string or null.
Look for "Architect", "Designer", "Architect Name:", etc.
Examples:
- "Architect: Design Firm Inc." → "Design Firm Inc."
- If missing, null.
`;

export const architectAddressModule = `
Extract architect_address: string or null.
Look for address near architect name.
Examples:
- "101 Pine Rd, Hamlet, ST 44556" → "101 Pine Rd, Hamlet, ST 44556"
- If missing, null.
`;

const outputFormat = `
Output strict JSON: {
  "contract_number": "string or null",
  "contract_amount": "number or null",
  "constructor_name": "string or null",
  "constructor_address": "string or null",
  "project_name": "string or null",
  "project_address": "string or null",
  "owner_name": "string or null",
  "owner_address": "string or null",
  "architect_name": "string or null",
  "architect_address": "string or null",
  "scope_of_work": "string or null"
}
`;

export const composeEssentialsPrompt = (text: string) => `
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

${outputFormat}

Text:
${text}
`;