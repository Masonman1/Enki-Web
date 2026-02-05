// lib/prompts/trigger-rewrite.ts
export interface ClausePromptParams {
  clause_title?: string;
  category?: string;
  trigger_threshold?: string;
  protections_exclusions?: string;
  receipt_conditions?: string;
  standards_to_consider?: string; // Comma-separated or free text; if blank, omit tool use
  is_general_conditions?: boolean;
  additional_details?: string;
}

export function composeClausePrompt(params: ClausePromptParams): string {
  const {
    clause_title = '',
    category = '',
    trigger_threshold = '',
    protections_exclusions = '',
    receipt_conditions = '',
    standards_to_consider = '',
    is_general_conditions = false,
    additional_details = '',
  } = params;

  // Verbatim prompt from PDF page 1, with refinements prioritizing chaining for incomplete results, better standard integration/receipt rewriting, and emphasis on exclusions without assuming subcontractor actions
  const basePrompt = `
You are an expert waterproofing subcontractor PM in the US, specializing in protective contract clauses for construction risks.

Generate a concise one-paragraph contract exhibit clause based on the following structured user inputs (e.g., clause title if provided, category, trigger/threshold, protections/exclusions, receipt conditions, standards, Is General Conditions flag, additional details). Take your time to think step-by-step: First, identify key risks and protections, including non-trade-specific ones like economic escalations. Second, if relevant (or if Standards field is populated), use tools like web search or browse page to research and identify the most applicable US-based governing body standards (e.g., from ASTM, ACI, ICRI, ConsensusDocs, or manufacturer guidelines like Sika) or common legal qualifiers (e.g., 'to the fullest extent permitted by law') for the topic (e.g., preparation requirements, risk exclusions, or escalation triggers)—prioritize chaining multiple calls if initial results are incomplete (e.g., follow up on URLs or refine queries for precise metrics), focusing only on those that enhance enforceability and fit naturally; omit if none apply or if the Standards field is blank. Extract specific metrics (e.g., depths, tolerances, cleanliness requirements) from the standards to inform and rewrite receipt conditions precisely. Third, deliberate on balance: Emphasize how the subcontractor receives the substrate/materials (e.g., clean, properly prepared per standards with specific depths if applicable), include clear exclusions without mandating actions by others (imply via receipt conditions), and add no-liability clauses for conditions/delays/extra costs—avoid combative tone, specific remedies, or prescriptive commands unless explicitly requested in Additional Details; never assume the subcontractor performs actions like installation if exclusions indicate otherwise. If Is General Conditions is true, make job-wide without scope ties. Fourth, infer a concise snake_case suggested_name (≤50 chars) from inputs like category, exclusions, and main risk if no title is provided (e.g., joint_filler_recess_exclusion). Keep the clause professional, clear, under 85 words, focused on the body—do not include repeated intros like 'As [Role], the undersigned...' as this will be handled in a shared exhibit header; avoid any repetition or elaboration.

Output only strict JSON: { "clause_rewrite": "string", "suggested_name": "string" }.

*** See next page for user inputs ***
`;

  // Formatted structured inputs as a labeled list for clarity and AI parsing
  const userInputs = `
Clause Title: ${clause_title}
Clause Category: ${category}
Trigger / Threshold: ${trigger_threshold}
Protections and Exclusions: ${protections_exclusions}
Receipt Conditions: ${receipt_conditions}
Standards to Consider: ${standards_to_consider}
Is General Conditions: ${is_general_conditions ? 'true' : 'false'}
Additional Details: ${additional_details}
`;

  return basePrompt + userInputs;
}