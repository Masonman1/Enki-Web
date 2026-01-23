// app/phase1a/page.tsx
'use client';

import { usePhaseUpload } from '@/lib/phase-hook';
import PhaseLayout from '@/components/phase-layout';
import { PHASE_CONFIGS } from '@/lib/phase-config'; // Import centralized config
import toast from 'react-hot-toast'; // For onEmailClick stub and test toasts
import { Button } from '@/components/ui/button'; // Ensure Button is imported (assuming it is from ui components)
import { useAuth } from '@/lib/use-auth'; // NEW: Import for session/userId

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
  const { session } = useAuth(); // NEW: Pull session for userId in test

  return (
    <div className="container mx-auto p-4"> {/* Optional wrapper for layout if needed */}
      {/* Temporary Test Button for PDF Splitting */}
      <Button 
        variant="secondary" 
        onClick={async () => {
          try {
            const { parseFilesAction } = await import('@/lib/ai-actions');
            const testUrl = 'https://uzxnveukrvycwftcfzjl.supabase.co/storage/v1/object/sign/enki-storage/jobs/user_a288c013-35e9-4d16-8313-31804fae9b9b/phase1a/17fd07f6-d9ce-4f69-a6a5-e3f59a0c6f00/sampleContract.pdf?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9jNDczOTZlMC03NjAwLTQ4MjEtODk0Mi05ZmM3ZDJjNGViZDciLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJlbmtpLXN0b3JhZ2Uvam9icy91c2VyX2EyODhjMDEzLTM1ZTktNGQxNi04MzEzLTMxODA0ZmFlOWI5Yi9waGFzZTFhLzE3ZmQwN2Y2LWQ5Y2UtNGY2OS1hNmE1LWUzZjU5YTBjNmYwMC9zYW1wbGVDb250cmFjdC5wZGYiLCJpYXQiOjE3NjkxOTA5MzgsImV4cCI6MTc3MTc4MjkzOH0.FqHXOMDdpAJLD4j-O2aJOZAvT40fZDijdMdU9Z9sYzI'; // Replace with real URL or Supabase signed URL (e.g., from your test-data or storage)
            const userId = session?.user?.id; // NEW: From session for Supabase path (RLS: user_<uid>)
            const results = await parseFilesAction([testUrl], 'phase1a', 'split', userId); // Target split subphase
            console.log('Test Split Results:', results);
            toast.success('PDF split—check Supabase sections and console for URLs');
          } catch (err) {
            console.error('Test failed:', err);
            toast.error('Split test failed');
          }
        }}
      >
        Test PDF Splitting
      </Button>

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
    </div>
  );
}

// Note: This page is fully centralized via PHASE_CONFIGS and usePhaseUpload hook.
// For custom overrides (e.g., onGenerateCustom for unique generation logic), add them here or in PHASE_CONFIGS.
// The test button is temporary—remove after validating PDF splitting in ai-actions.ts.