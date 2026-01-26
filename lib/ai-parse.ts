// lib/ai-parse.ts (UPDATED: Chain subphases for 'phase1a'; handle userId; aggregate results with error checks)
export const parseFiles = async (fileUrls: string[], options: { focus?: string; userId: string }) => {
  const { parseFilesAction } = await import('@/lib/ai-actions'); // Dynamic import for server action
  const { focus = 'phase1a', userId } = options; // Assume userId passed from hook

  if (focus !== 'phase1a') {
    // Fallback or other phases; for now, throw or adapt
    throw new Error(`Unsupported focus: ${focus}`);
  }

  // Chain: Essentials first (insert job, get path)
  const essentialsResults = await parseFilesAction(fileUrls, 'essentials', userId);
  const essentials = essentialsResults[0]; // Assume single file for Phase 1A
  if (essentials.error_msg) throw new Error(essentials.error_msg);

  const path = essentials.storage_path;
  if (!path) throw new Error('No storage_path from essentials');

  // Splits: Upload sections (no meaningful return, but run for side-effect)
  await parseFilesAction(fileUrls, 'split', userId, path);

  // Risks: Parse on splits, aggregate
  const risksResults = await parseFilesAction(fileUrls, 'risks', userId, path);
  const risks = risksResults[0];
  if (risks.error_msg) throw new Error(risks.error_msg);

  // Aggregate for hook (essentials + flattened risks)
  return { ...essentials, risks: risks.risks };
};