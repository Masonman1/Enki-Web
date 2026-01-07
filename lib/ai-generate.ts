export const generateFromRisks = async (risks: string[], options: { type: 'exhibits' | 'clauses' | 'notes' | 'packages'; context?: { jurisdiction?: string; materialType?: string; leadTime?: number } } = { type: 'exhibits' }) => {
  // Stub for AI generation: Mock outputs from parsed risks (configurable Claude/Grok later)
  // Outputs for one-click emails/POs; add context for waterproofing-specific (e.g., VOC per jurisdiction)
  const { type, context = {} } = options;
  const { jurisdiction = 'US', materialType = 'membrane', leadTime = 4 } = context;

  if (!risks || risks.length === 0) return [];

  return risks.map((risk) => {
    const riskDetail = risk.split(': ')[1] || risk; // Fallback if no ': ' format
    let prefix = '';
    switch (type) {
      case 'exhibits':
        prefix = `Exhibit Clause: Require GC/vendor confirmation on ${riskDetail}`;
        break;
      case 'clauses':
        prefix = `PO Clause: Address ${riskDetail} with vendor stock confirmation`;
        break;
      case 'notes':
        prefix = `Review Note: Verify ${riskDetail} per Exhibit A`;
        break;
      case 'packages':
        prefix = `Closeout Item: Resolve ${riskDetail} with GC sign-off`;
        break;
      default:
        prefix = `Generated: Mitigate ${riskDetail}`;
    }
    // Add context (e.g., jurisdiction for VOC, material for substrate)
    if (riskDetail.includes('VOC')) prefix += ` (per ${jurisdiction} regs)`;
    if (riskDetail.includes('Substrate')) prefix += ` for ${materialType} compatibility`;
    if (riskDetail.includes('Lead Time')) prefix += ` (average ${leadTime} weeks)`;

    return prefix + ' to mitigate liability.';
  });
};

// Deprecated aliases for backward compat (remove in future)
export const generateExhibits = (risks: string[]) => generateFromRisks(risks, { type: 'exhibits' });
export const generateSubmittals = (risks: string[]) => generateFromRisks(risks, { type: 'clauses' });

import { OptimizedChatSummary } from '@/lib/schemas/optimized-chat-summary';  // Adjust path if needed

interface RawSummaryData {
  chatId: string;
  date: string;
  overview: string;
  keyAchievements?: string[];
  decisionsMade?: string[];
  openTodos?: { description: string; priority: string }[];
  nextSteps?: string[];
  contextReminders?: string[];
  parentChatId: string | null;
  priorSummaries?: RawSummaryData[];  // Recursive for prior summaries (type-safe over any)
  incompleteStatus?: { automationsTested: string[]; automationsPending: string[] };
  continuationFlag: boolean;
  files_affected?: string[];  // Optional for ov.files
}

export const minifySummary = (data: RawSummaryData): OptimizedChatSummary => {
  return {
    id: data.chatId,
    dt: data.date,
    ov: {
      changes: [data.overview.substring(0, 100) + (data.overview.length > 100 ? '...' : '')],
      branch: 'refactor-phase1-flatten',  // Derive or hardcoded
      files: data.files_affected || [],
      next_action: data.nextSteps?.[0]?.substring(0, 100) + (data.nextSteps?.[0]?.length > 100 ? '...' : '') || ''
    },
    achvs: data.keyAchievements?.slice(0, 5).map((item: string) => item.substring(0, 100)) || [],
    decs: data.decisionsMade?.slice(0, 5).map((item: string) => item.substring(0, 100)) || [],
    nxt: data.nextSteps?.slice(0, 5).map((item: string) => item.substring(0, 100)) || [],
    ctx: data.contextReminders?.slice(0, 5).map((item: string) => item.substring(0, 100)) || [],
    pid: data.parentChatId,
    stat: {
      tested: data.incompleteStatus?.automationsTested || [],
      pend: data.incompleteStatus?.automationsPending || []
    },
    cont: data.continuationFlag,
    schema_version: 'v2-opt'
  };
  // Omit empties manually if needed (TypeScript optionals handle)
};

export const formatForHuman = (json: OptimizedChatSummary): string => {
  return `
**Chat ID:** ${json.id}
**Date:** ${json.dt}
**Overview:** Changes: ${json.ov.changes.join(', ')}. Branch: ${json.ov.branch || 'None'}. Files: ${json.ov.files?.join(', ') || 'None'}. Next Action: ${json.ov.next_action}.
**Key Achievements:**
${json.achvs.map(item => `- ${item}`).join('\n')}
**Decisions Made:**
${json.decs.map(item => `- ${item}`).join('\n')}
**Open To-Dos:**
${json.todos ? json.todos.map(todo => `- ${todo.desc} (Priority: ${todo.pri})`).join('\n') : 'None'}
**Next Steps:**
${json.nxt.map(item => `- ${item}`).join('\n')}
**Context Reminders:**
${json.ctx.map(item => `- ${item}`).join('\n')}
**Parent Chat ID:** ${json.pid || 'None'}
**Incomplete Status:** Tested: ${json.stat.tested.join(', ') || 'None'}; Pending: ${json.stat.pend.join(', ') || 'None'}
**Continuation Flag:** ${json.cont ? 'True' : 'False'}
**Schema Version:** ${json.schema_version || 'N/A'}
`;
};