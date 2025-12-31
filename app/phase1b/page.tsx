'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // For router.push
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { generateFromRisks } from '@/lib/ai-generate';
import toast from "react-hot-toast"; // For notifications

export default function Phase1B() {
  const [generatedExhibits, setGeneratedExhibits] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGenerateSubmittals = async () => {
    setLoading(true);
    try {
      // Stub risks as strings (future: Integrate from uploads or Supabase)
      const mockRisks = [
        "Risk: Substrate mismatch (e.g., incompatible membrane on gypsum)",
        "Risk: Lead time >4wks for flashing materials"
      ];
      console.log('Generating from mock risks:', mockRisks); // Debug log
      const exhibits = await generateFromRisks(mockRisks, { type: 'exhibits', context: { jurisdiction: 'CA' } });
      console.log('Generated exhibits:', exhibits); // Debug log
      setGeneratedExhibits(exhibits);
      toast.success('Exhibits generated successfully!');
    } catch (error) {
      console.error('AI Generate Error:', error);
      toast.error('Generation failed - check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[450px]">
        <CardHeader>
          <CardTitle>Phase 1B: Submittal Generation Wizard</CardTitle>
          <CardDescription>Review parsed risks and generate compliance exhibits/submittals with one click.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Based on uploaded specs/subcontracts: Stub risks detected (e.g., substrate mismatch, lead time &gt;4wks).</p>
          <Button onClick={handleGenerateSubmittals} disabled={loading}>
            {loading ? 'Generating...' : 'Generate Protection Exhibit'}
          </Button>
          {generatedExhibits.length > 0 && (
            <div className="mt-4 space-y-4">
              <h4 className="text-sm font-medium">Generated Exhibit Clauses:</h4>
              {generatedExhibits.map((exhibit, idx) => (
                <Alert key={idx} variant="default">
                  <AlertDescription>{exhibit}</AlertDescription>
                </Alert>
              ))}
            </div>
          )}
          <Button className="mt-6" variant="outline" onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
        </CardContent>
      </Card>
    </main>
  );
}