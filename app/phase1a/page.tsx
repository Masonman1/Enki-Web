// app/phase1a/page.tsx
'use client';

import { usePhaseUpload } from '@/lib/phase-hook';
import PhaseLayout from '@/components/phase-layout';
import { PHASE_CONFIGS } from '@/lib/phase-config'; // Import centralized config
import toast from 'react-hot-toast'; // For onEmailClick stub and test toasts

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

  return (
    <div className="container mx-auto p-4">
      <PhaseLayout // NEW: Reuse layout for consistency
        title="Phase 1A: Pre-Bid Protection/Job Setup"
        description="Drag-drop subcontracts/proposals/emails → consolidate scope (CSI codes, qtys, deltas) → flag risks/misses → generate protective exhibits/clauses."
        loading={loading} // Pass to PhaseLayout for centralized handling
        error={error}
        risks={risks}
        generatedItems={generatedItems}
        parsedEssentials={parsedEssentials}
        handleUpload={handleUpload}
        generateType="exhibits"
        onEmailClick={() => toast.success('Stub: One-click email protected exhibits to GC')} // Optional: Phase-specific stub
      />
    </div>
  );
}