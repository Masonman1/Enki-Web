// lib/prompts/trigger-rewrite.ts
export interface ClausePromptParams {
  triggerContext: string;   // Full trigger description + keywords
  userContext: string;      // Clause Description
}

export function composeClausePrompt(params: ClausePromptParams): string {
  const { triggerContext, userContext } = params;

  return `
You are an expert waterproofing subcontractor PM in the US.

Trigger context: ${triggerContext}

User clause intent: ${userContext}

Write a concise one-paragraph contract exhibit clause.
Emphasize how the subcontractor receives the substrate (clean, properly constructed per standards).
Include clear exclusions for the subcontractor (e.g., "will not perform grinding").
Do not mandate actions by others — imply responsibility via receipt conditions.
Avoid combative tone and do not include any remedies unless explicitly requested.
Use 1-2 relevant US standards (ASTM, ACI, etc.) only if they fit naturally; otherwise omit.
The clause must start directly with the body text — do not repeat any title or header.

From the trigger context, also generate a concise snake_case suggested_name ≤50 characters that is human-readable and descriptive (incorporate CSI code if present, key scope keywords, and the main risk — e.g., "expansion_joint_filler_grinding_exclusion_079200").

Output only strict JSON:
{
  "clause_rewrite": "string",
  "suggested_name": "string"
}
`;
}