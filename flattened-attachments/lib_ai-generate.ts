// lib/ai-generate.ts
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
    // Append waterproofing context (e.g., lead time, VOC compliance, material type)
    return `${prefix}. Context: ${materialType} in ${jurisdiction}; Lead time: ${leadTime} weeks.`;
  });
};

// Client-side formatter for human-readable summaries (no AI/automation; pure templating)
// Used in dashboard for display/storage of readable text from JSON rows
export const formatForHuman = (json: Record<string, unknown>): string => { // Use Record instead of any
  if (!json || typeof json !== 'object') return 'Invalid JSON';

  // Handle schema variations (v2-simplified or older)
  const id = 'id' in json ? json.id as string : 'N/A';
  const dt = 'dt' in json ? json.dt as string : 'N/A';
  const overview = 'ov' in json && json.ov ? 
    `Changes: ${(json.ov as Record<string, unknown>).changes?.join(', ') || 'None'}; Branch: ${(json.ov as Record<string, unknown>).branch || 'N/A'}; Files: ${(json.ov as Record<string, unknown>).files?.join(', ') || 'None'}; Next: ${(json.ov as Record<string, unknown>).next_action || 'None'}`
    : 'overview' in json ? json.overview as string : 'N/A';
  const achvs = 'achvs' in json ? json.achvs as string[] : [];
  const decs = 'decs' in json ? json.decs as string[] : [];
  const todos = 'todos' in json ? json.todos as Array<Record<string, unknown>> : ('openTodos' in json ? json.openTodos as Array<Record<string, unknown>> : []); // Use Record for todo items
  const todosStr = todos.map((t) => `- ${t.desc || t.description || 'N/A'} (Priority: ${t.pri || t.priority || 'N/A'})`).join('\n');
  const nxt = 'nxt' in json ? json.nxt as string[] : ('nextSteps' in json ? json.nextSteps as string[] : []);
  const ctx = 'ctx' in json ? json.ctx as string[] : ('contextReminders' in json ? json.contextReminders as string[] : []);
  const pid = 'pid' in json ? json.pid as string : ('parentChatId' in json ? json.parentChatId as string : 'None');
  const stat = 'stat' in json && json.stat ? `Tested: ${(json.stat as Record<string, unknown>).tested?.join(', ') || 'None'}; Pending: ${(json.stat as Record<string, unknown>).pend?.join(', ') || 'None'}`
    : 'incompleteStatus' in json && json.incompleteStatus ? `Tested: ${(json.incompleteStatus as Record<string, unknown>).automationsTested?.join(', ') || 'None'}; Pending: ${(json.incompleteStatus as Record<string, unknown>).automationsPending?.join(', ') || 'None'}`
    : 'None';
  const cont = 'cont' in json ? (json.cont as boolean ? 'True' : 'False') : ('continuationFlag' in json ? (json.continuationFlag as boolean ? 'True' : 'False') : 'False');
  const schema_version = 'schema_version' in json ? json.schema_version as string : 'N/A';

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