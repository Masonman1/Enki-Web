// lib/prompts/phase1a/split-prompts.ts
// Dedicated prompts for identifying subcontract sections (e.g., schedule, insurance) via headings
// Outputs JSON of { section: 'start-end' } – no text extraction

export const splitModule = `
Identify major sections in the subcontract PDF based on headings (case-insensitive). Focus on waterproofing-relevant ones like:
- "Project Schedule" or "Gantt"
- "Insurance Requirements"
- "Safety Requirements" or "Site Protocols"
- "Scope of Work" or "Exhibit A/B"
- "Exhibits/Clauses"
- Others if detected (e.g., "Change Orders", "Billing").

For each, return start-end page ranges (1-indexed, inclusive). If no clear boundary, estimate based on content shifts.
Examples:
- Heading "Project Schedule" on page 156, ends at 160 → 'schedule': '156-160'
- "Insurance" spans 45-52 → 'insurance': '45-52'

Output strict JSON: { "section_name": "start-end", ... }
If no sections found, empty object {}.
`;

export const composeSplitPrompt = (text: string) => `
Scan the subcontract text for major section headings without extracting or analyzing content.

${splitModule}

Text (headings only for detection):
${text}
`;