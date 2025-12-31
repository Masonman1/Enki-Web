import { generateFromRisks } from '@/lib/ai-generate';

test('generateFromRisks returns context-aware clauses', async () => {
  const mockRisks = ['Risk: VOC compliance violation'];
  const clauses = await generateFromRisks(mockRisks, { type: 'clauses', context: { jurisdiction: 'CA' } });
  expect(clauses[0]).toContain('(per CA regs)');
});