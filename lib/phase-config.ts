// lib/phase-config.ts (NEW: Centralized configs for Phase 1 sub-phases; extendable for future phases)
// Extracted from repeated patterns in phase pages (e.g., focus, generateType, context, fields)
// Allows single import/update for consistency; hook consumes by phase key (e.g., 'phase1a')

import { PhaseUploadOptions } from '@/lib/phase-hook'; // Import for type safety

export const PHASE_CONFIGS: Record<string, PhaseUploadOptions> = {
  phase1a: {
    focus: 'phase1a',
    generateType: 'exhibits',
    extraParsedFields: [
      'contract_number',
      'contract_amount',
      'constructor_name',
      'constructor_address',
      'project_name',
      'project_address',
      'owner_name',
      'owner_address',
      'architect_name',
      'architect_address',
      'scope_of_work',
    ],
    context: { jurisdiction: 'US', materialType: 'membrane', leadTime: 4 },
  },
  phase1b: {
    focus: 'phase1b', // Adapt from page: Pre-bid essentials/misses (similar to 1A but post-bid)
    generateType: 'exhibits',
    extraParsedFields: [], // No explicit essentials in original; can add if needed
    context: { jurisdiction: 'US', materialType: 'membrane', leadTime: 4 }, // Reuse default
  },
  phase1c: {
    focus: 'phase1c', // Specs parsing for products/VOC/lead times
    generateType: 'clauses', // Adapt: Generates matches/risks/alternates (clauses-like)
    extraParsedFields: [], // Custom parsedProducts in page; hook can handle via onGenerateCustom if extended
    context: { jurisdiction: 'US', materialType: 'membrane', leadTime: 4 },
    // Note: For custom (e.g., product parsing), add onGenerateCustom in page if needed
  },
  phase1d: {
    focus: 'phase1d', // RFIs
    generateType: 'notes', // Generates items (review notes)
    extraParsedFields: [],
    context: {},
  },
  phase1e: {
    focus: 'phase1e', // Submittals log
    generateType: 'notes',
    extraParsedFields: [],
    context: {},
  },
  phase1f: {
    focus: 'phase1f', // Scheduling/progress
    generateType: 'notes', // Look-aheads/clauses
    extraParsedFields: [],
    context: {},
  },
  phase1g: {
    focus: 'phase1g', // Change orders
    generateType: 'clauses',
    extraParsedFields: [],
    context: {},
  },
  phase1h: {
    focus: 'phase1h', // Procurement
    generateType: 'clauses', // PO clauses
    extraParsedFields: [],
    context: {},
  },
  phase1i: {
    focus: 'phase1i', // Invoice review
    generateType: 'notes',
    extraParsedFields: [],
    context: {},
  },
  phase1j: {
    focus: 'phase1j', // Billing
    generateType: 'notes', // Payment apps/retainage notes
    extraParsedFields: [],
    context: {},
  },
  phase1k: {
    focus: 'phase1k', // Closeout
    generateType: 'packages',
    extraParsedFields: [],
    context: {},
  },
};

// Usage: In phase page: const config = PHASE_CONFIGS['phase1a']; usePhaseUpload(config);