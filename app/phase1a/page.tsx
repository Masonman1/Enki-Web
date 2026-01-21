// app/phase1a/page.tsx (UPDATED: Removed unused 'uploading' prop to PhaseLayout; loading now handles all states)
'use client';

import { usePhaseUpload } from '@/lib/phase-hook';
import PhaseLayout from '@/components/phase-layout';
import { PHASE_CONFIGS } from '@/lib/phase-config'; // Import centralized config
import toast from 'react-hot-toast'; // For onEmailClick stub

export default function Phase1A() {
  const config = PHASE_CONFIGS['phase1a']; // Fetch config by key
  const { 
    error, 
    risks, 
    generatedItems, 
    parsedEssentials, 
    handleUpload, 
    loading  // Propagate loading (covers init + uploading)
  } = usePhaseUpload(config); // Pass config directly

  return (
    <PhaseLayout
      title="Phase 1A: Pre-Bid Subcontract Protection"
      description="Upload subcontract PDFs to extract essentials, identify risks, and generate protective exhibits/clauses."
      loading={loading} // Pass to PhaseLayout for centralized handling
      error={error}
      risks={risks}
      generatedItems={generatedItems}
      parsedEssentials={parsedEssentials}
      handleUpload={handleUpload}
      generateType="exhibits"
      onEmailClick={() => toast.success('Stub: One-click email protected exhibits to GC')} // Optional: Phase-specific stub
    />
  );
}

// Note: Similarly update other phase pages (e.g., phase1b/page.tsx) by importing PHASE_CONFIGS, fetching by key (e.g., 'phase1b'), and passing to usePhaseUpload/PhaseLayout.
// For phases with custom generation (e.g., Phase 1C's parsedProducts), add onGenerateCustom to their config or override in page if needed.