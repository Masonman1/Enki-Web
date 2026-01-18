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
export const formatForHuman = (json: any): string => {
  if (!json || typeof json !== 'object') return 'Invalid JSON';

  // Handle schema variations (v2-simplified or older)
  const id = 'id' in json ? json.id : 'N/A';
  const dt = 'dt' in json ? json.dt : 'N/A';
  const overview = 'ov' in json && json.ov ? 
    `Changes: ${json.ov.changes?.join(', ') || 'None'}; Branch: ${json.ov.branch || 'N/A'}; Files: ${json.ov.files?.join(', ') || 'None'}; Next: ${json.ov.next_action || 'None'}`
    : 'overview' in json ? json.overview : 'N/A';
  const achvs = 'achvs' in json ? json.achvs : [];
  const decs = 'decs' in json ? json.decs : [];
  const todos = 'todos' in json ? json.todos : ('openTodos' in json ? json.openTodos : []);
  const todosStr = todos.map((t: any) => `- ${t.desc || t.description} (Priority: ${t.pri || t.priority || 'N/A'})`).join('\n');
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