// lib/ai-actions/error-utils.ts
// Extracted error handling and fallbacks

export interface ParsedJob {  // NEW: Add 'export' keyword
  contract_number: string | null;
  contract_amount: number | null;
  constructor_name: string | null;
  constructor_address: string | null;
  project_name: string | null;
  project_address: string | null;
  owner_name: string | null;
  owner_address: string | null;
  architect_name: string | null;
  architect_address: string | null;
  scope_of_work: string | null;
  splits: Record<string, string>;
  storage_path: string | null;
  error_msg?: string;
}

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
    splits: {},
    storage_path: null,
    error_msg: `Overall error: ${errorMsg}`
  };
}