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