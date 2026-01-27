// test-summary.ts (UPDATED: Removed invalid minifySummary import to fix build error; use formatForHuman only)

import { formatForHuman } from '@/lib/ai-generate'; // For human-readable chat summary display

const sampleData = {
  chatId: '17',
  date: '2026-01-24',
  overview: 'Refined Phase 1A schema and workflow; centralized Phase 1 patterns.',
  achievements: [
    'Finalized storage schema (e.g., raw_uploads jsonb, scope_details_json)',
    'Updated workflow summary with real-world examples (e.g., Hillmont vs. Greenway deltas)'
  ],
  decisions: [
    'Relational-first for committed data; JSON for flexible (e.g., drafts)',
    'Added raw_uploads for originals like .msg emails'
  ],
  todos: [
    { desc: 'Implement PDF splitting in ai-actions.ts', pri: 'high' },
    { desc: 'Test Phase 1A end-to-end', pri: 'medium' }
  ],
  nextSteps: [
    'Code migration for schema changes',
    'Refine prompts for scope consolidation'
  ],
  context: [
    'Focus on waterproofing PM risks (e.g., substrate, lead times)',
    'Tie to downstream phases (e.g., submittals from CSI scopes)'
  ],
  parentId: '16',
  incompleteStatus: 'Pending: ai-actions.ts validation',
  continuationFlag: false,
  schemaVersion: 'v1.2'
};

const formatted = formatForHuman(sampleData);
console.log(formatted); // Test output for human-readable summary (e.g., in dev dashboard)