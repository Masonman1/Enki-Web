export const parseFiles = async (fileUrls: string[], options: { focus?: string } = {}) => {
  const { parseFilesAction } = await import('@/lib/ai-actions'); // Dynamic import for server action
  return parseFilesAction(fileUrls, options.focus);
};