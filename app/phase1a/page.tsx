// app/phase1a/page.tsx (SWITCHED: To Sonner for stable API; test button updated—remove after verification)
'use client';

import { usePhaseUpload } from '@/lib/phase-hook';
import PhaseLayout from '@/components/phase-layout';
import { PHASE_CONFIGS } from '@/lib/phase-config'; // Import centralized config
import { toast } from 'sonner'; // NEW: Sonner import (named { toast })
import { Button } from '@/components/ui/button'; // For test button

export default function Phase1A() {
  const config = PHASE_CONFIGS['phase1a']; // Fetch config by key
  const { 
    error, 
    risks, 
    generatedItems, 
    parsedEssentials, 
    handleUpload, 
    loading  // Propagate loading (auth/session/upload)
  } = usePhaseUpload(config); // Pass config to hook

  // Temporary test function for Sonner verification (remove after testing)
  const testToast = () => {
    const id = 'test';
    toast.loading('Test load', { id });
    toast('Test update', { id }); // Overwrites the same toast
    toast.dismiss(id);
    toast.success('Test success');
  };

  return (
    <div className="container mx-auto p-4">
      <PhaseLayout // Reuse layout for consistency
        title="Phase 1A: Pre-Bid Protection/Job Setup"
        description="Drag-drop subcontracts/proposals/emails → consolidate scope (CSI codes, qtys, deltas) → flag risks/misses → generate protective exhibits/clauses."
        loading={loading} // Pass to PhaseLayout for centralized handling
        error={error}
        risks={risks}
        generatedItems={generatedItems}
        parsedEssentials={parsedEssentials}
        handleUpload={handleUpload}
        generateType="exhibits"
        onEmailClick={() => toast.success('Stub: One-click email protected exhibits to GC')} // Updated for Sonner
      />
      {/* Temporary test button for Sonner verification - remove after testing */}
      <Button onClick={testToast} variant="outline" className="mt-4">Test Toast</Button>
    </div>
  );
}