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
        prefix = `PO Clause: Include ${riskDetail} protection (e.g., VOC per ${jurisdiction})`;
        break;
      case 'notes':
        prefix = `Review Note: Flag ${riskDetail} for submittal/warranty`;
        break;
      case 'packages':
        prefix = `Closeout Package: Verify ${riskDetail} resolution (e.g., ${materialType} lead time ${leadTime} weeks)`;
        break;
      default:
        prefix = `Generated: Address ${riskDetail}`;
    }
    return `${prefix} in waterproofing context.`;
  });
};

export const formatForHuman = (json: Record<string, unknown>): string => {  // UPDATED: Record for json param
  const id = 'id' in json ? json.id as string : 'N/A';
  const dt = 'dt' in json ? json.dt as string : 'N/A';

  // UPDATED: Narrow ov to expected shape with type assertions
  const ov = 'ov' in json ? json.ov as { changes?: string[]; branch?: string; files?: string[]; next_action?: string } : undefined;
  const overview = ov 
    ? `Changes: ${ov.changes?.join(', ') || 'None'}; Branch: ${ov.branch || 'N/A'}; Files: ${ov.files?.join(', ') || 'None'}; Next: ${ov.next_action || 'None'}`
    : 'overview' in json ? json.overview as string : 'N/A';

  const achvs = 'achvs' in json ? json.achvs as string[] : [];
  const decs = 'decs' in json ? json.decs as string[] : [];
  const todos = 'todos' in json ? json.todos as { desc: string; pri: string }[] : [];
  const nxt = 'nxt' in json ? json.nxt as string[] : [];
  const ctx = 'ctx' in json ? json.ctx as string[] : [];
  const pid = 'pid' in json ? json.pid as string | null : null;

  // UPDATED: Narrow stat to expected shape
  const stat = 'stat' in json ? json.stat as { tested?: string[]; pend?: string[] } : undefined;
  const incompleteStatus = stat 
    ? `Tested: ${stat.tested?.join(', ') || 'None'}; Pending: ${stat.pend?.join(', ') || 'None'}`
    : 'incompleteStatus' in json ? json.incompleteStatus as string : 'None';

  const cont = 'cont' in json ? json.cont as boolean : false;
  const schema_version = 'schema_version' in json ? json.schema_version as string : 'N/A';

  // UPDATED: Use narrowed incompleteStatus
  return `
Chat ID: ${id}
Date: ${dt}
Overview: ${overview}
Key Achievements:
${achvs.map((item: string) => `- ${item}`).join('\n')}
Decisions Made:
${decs.map((item: string) => `- ${item}`).join('\n')}
Open To-Dos:
${todos.map((todo: { desc: string; pri: string }) => `- ${todo.desc} (${todo.pri})`).join('\n') || 'None'}
Next Steps:
${nxt.map((item: string) => `- ${item}`).join('\n')}
Context Reminders:
${ctx.map((item: string) => `- ${item}`).join('\n')}
Parent Chat ID: ${pid || 'None'}
Incomplete Status: ${incompleteStatus}
Continuation Flag: ${cont ? 'True' : 'False'}
Schema Version: ${schema_version}
`;
};