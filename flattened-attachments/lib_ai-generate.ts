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
    if (riskDetail.includes('VOC')) prefix += ` ( (per ${jurisdiction} regs)`;
    if (riskDetail.includes('Substrate')) prefix += ` for ${materialType} compatibility`;
    if (riskDetail.includes('Lead Time')) prefix += ` (average ${leadTime} weeks)`;

    return prefix + ' to mitigate liability.';
  });
};

// Deprecated aliases for backward compat (remove in future)
export const generateExhibits = (risks: string[]) => generateFromRisks(risks, { type: 'exhibits' });
export const generateSubmittals = (risks: string[]) => generateFromRisks(risks, { type: 'clauses' });

import type { OptimizedChatSummary } from './optimized-chat-summary.ts';  // Type-only import for interface (fixes runtime export error)

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
    todos: data.openTodos?.slice(0, 5).map((todo) => ({ desc: todo.description.substring(0, 100), pri: todo.priority })) || [],
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

export const formatForHuman = (json: OptimizedChatSummary | RawSummaryData): string => {  // Use union type for compatibility
  const id = json.id || ('chatId' in json ? json.chatId : 'Unknown');
  const dt = json.dt || ('date' in json ? json.date : 'Unknown');
  const overview = 'ov' in json && json.ov ? `Changes: ${json.ov.changes?.join(', ') || ''}. Branch: ${json.ov.branch || 'None'}. Files: ${json.ov.files?.join(', ') || 'None'}. Next Action: ${json.ov.next_action || ''}.` : ('overview' in json ? json.overview : 'None');
  const achvs = 'achvs' in json ? json.achvs : ('keyAchievements' in json ? json.keyAchievements : []);
  const decs = 'decs' in json ? json.decs : ('decisionsMade' in json ? json.decisionsMade : []);
  const todosStr = 'todos' in json && json.todos ? json.todos.map((todo: {desc: string, pri: string}) => `- ${todo.desc} (Priority: ${todo.pri})`).join('\n') 
    : 'openTodos' in json && json.openTodos ? json.openTodos.map((todo: {description: string, priority: string}) => `- ${todo.description} (Priority: ${todo.priority})`).join('\n') 
    : 'None';
  const nxt = 'nxt' in json ? json.nxt : ('nextSteps' in json ? json.nextSteps : []);
  const ctx = 'ctx' in json ? json.ctx : ('contextReminders' in json ? json.contextReminders : []);
  const pid = 'pid' in json ? json.pid : ('parentChatId' in json ? json.parentChatId : 'None');
  const stat = 'stat' in json && json.stat ? `Tested: ${json.stat.tested?.join(', ') || 'None'}; Pending: ${json.stat.pend?.join(', ') || 'None'}`
    : 'incompleteStatus' in json && json.incompleteStatus ? `Tested: ${json.incompleteStatus.automationsTested?.join(', ') || 'None'}; Pending: ${json.incompleteStatus.automationsPending?.join(', ') || 'None'}`
    : 'None';
  const cont = 'cont' in json ? (json.cont ? 'True' : 'False') : ('continuationFlag' in json ? (json.continuationFlag ? 'True' : 'False') : 'False');
  const schema_version = 'schema_version' in json ? json.schema_version : 'N/A';

  return `
Chat ID: ${id}
Date: ${dt}
Overview: ${overview}
Key Achievements:
${achvs.map((item: string) => `- ${item}`).join('\n')}
Decisions Made:
${decs.map((item: string) => `- ${item}`).join('\n')}
Open To-Dos:
${todosStr}
Next Steps:
${nxt.map((item: string) => `- ${item}`).join('\n')}
Context Reminders:
${ctx.map((item: string) => `- ${item}`).join('\n')}
Parent Chat ID: ${pid}
Incomplete Status: ${stat}
Continuation Flag: ${cont}
Schema Version: ${schema_version}
`;
};