// lib/ai-actions/error-utils.ts
// Extracted error handling and fallbacks

export function createFallbackParsed(errorMsg: string): ParsedJob {
  return {
    contract_number: null,
    contract_amount: null,
    constructor_name: null,
    constructor_address: null,
    project_name: null,
    project_address: null,
    owner_name: null,
    owner_address: null,
    architect_name: null,
    architect_address: null,
    scope_of_work: null,
    risks: [],
    splits: {},
    storage_path: null,
    error_msg: `Overall error: ${errorMsg}`
  };
}

// Interface (for type safety)
interface ParsedJob {
  // ... full fields as in original
  error_msg?: string;
}