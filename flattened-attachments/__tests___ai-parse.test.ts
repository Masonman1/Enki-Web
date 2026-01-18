import { parseFiles } from '@/lib/ai-parse';

test('parseFiles returns focus-specific risks', () => {
  const mockFiles: File[] = [];
  const risks = parseFiles(mockFiles, { focus: 'procurement' });
  expect(risks).toContain('Risk: Lead time for flashing materials exceeds GC schedule');
});