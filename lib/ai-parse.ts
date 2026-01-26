// lib/ai-parse.ts (updated to call API route for server-only execution)

export const parseFiles = async (fileUrls: string[], options: { focus?: string, userId?: string } = {}) => {
  const res = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileUrls, focus: options.focus, userId: options.userId }),
  });
  if (!res.ok) throw new Error('Parse API failed');
  return await res.json();
};