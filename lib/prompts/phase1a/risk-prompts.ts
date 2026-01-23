// lib/prompts/phase1a/risk-prompts.ts
// Waterproofing-specific risks (e.g., substrate misses, lead times) – from original flattenRisks

export const risksModule = `
Extract risks: array of strings.
Flag mismatches, ambiguities, or waterproofing risks like no substrate spec, lead time issues, or scope deltas (e.g., Hillmont $10,050 retaining walls vs. Greenway detailed $3,300 slab edges).
Examples:
- "No 4-week lead time for membrane" → "Risk: Lead time not specified"
- If none, empty array [].
`;

export const risksMissesModule = `
Extract risks_misses: { risks: string[], misses: string[], documentation_gaps: string[] }.
Deeper analysis of general risks and misses.
`;

export const waterproofingSpecificRisksMissesModule = `
Extract waterproofing_specific_risks_misses: { risks: string[], misses: string[] }.
Waterproofing-focused risks (e.g., material compatibility, VOC compliance).
`;

export const composeRiskPrompt = (text: string) => `
Identify waterproofing PM risks from the section text.

${risksModule}
${risksMissesModule}
${waterproofingSpecificRisksMissesModule}

Output JSON with risks array.

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