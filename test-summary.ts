import { minifySummary, formatForHuman } from './lib/ai-generate.ts';

const sampleData = {
  chatId: '17',
  date: '2026-01-07',
  overview: 'Optimized chat summary schema/generation in handoff workflow: short keys, structured ov, omit empties, human expansion',
  keyAchievements: ['Defined efficient schema...', 'Updated generation/validation...', 'Added human-readable expansion...', 'Simulated/tested workflow...'],
  decisionsMade: ['Prioritize structured ov...', 'Omit empties/optional fields...', 'Integrate formatter in ai-generate.ts...', 'Add verbose_mode flag...'],
  openTodos: [],
  nextSteps: ['Test full end-to-end handoff in new chat', 'Validate Supabase upsert...'],
  contextReminders: ['Enki Phase 1: Complement tools via upload/parse/generate...'],
  parentChatId: '16',
  priorSummaries: [],
  incompleteStatus: { automationsTested: ['schema', 'generation', 'validation', 'expansion', 'simulation'], automationsPending: [] },
  continuationFlag: true,
  files_affected: ['Revised Full Handoff Workflow.json', 'apps_web_lib_schemas_optimized-chat-summary.ts', 'apps_web_lib_ai-generate.ts']
};

const optimized = minifySummary(sampleData);
console.log('Optimized JSON:', JSON.stringify(optimized, null, 2));
console.log('Human-Readable:', formatForHuman(optimized));