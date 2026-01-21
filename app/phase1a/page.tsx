// app/phase1a/page.tsx (updated full file for context; changes at top)
'use client';

import { usePhaseUpload } from '@/lib/phase-hook'; // Removed: import { useRouter } from 'next/navigation';
import PhaseLayout from '@/components/phase-layout';

// Removed: const router = useRouter(); (unused)

export default function Phase1A() {
  const { 
    uploading, 
    error, 
    risks, 
    generatedItems, 
    parsedEssentials, 
    handleUpload, 
    loading 
  } = usePhaseUpload({
    focus: 'phase1a',
    generateType: 'exhibits',
    extraParsedFields: [
      'contract_number',
      'contract_amount',
      'constructor_name',
      'constructor_address',
      'project_name',
      'project_address',
      'owner_name',
      'owner_address',
      'architect_name',
      'architect_address',
      'scope_of_work'
    ],
    context: { jurisdiction: 'US', materialType: 'membrane', leadTime: 4 },
  });

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <PhaseLayout
      title="Phase 1A: Pre-Bid Subcontract Protection"
      description="Upload subcontract PDFs to extract essentials, identify risks, and generate protective exhibits/clauses."
      uploading={uploading}
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