// app/phase1a/page.tsx
'use client';

import { usePhaseUpload } from '@/lib/phase-hook';
import PhaseLayout from '@/components/phase-layout';
import { PHASE_CONFIGS } from '@/lib/phase-config'; // Import centralized config
import toast from 'react-hot-toast'; // For onEmailClick stub and test toasts
import { Button } from '@/components/ui/button'; // Ensure Button is imported (assuming it is from ui components)
import { useAuth } from '@/lib/use-auth'; // NEW: Import for session/userId
import { parseFilesAction } from '@/lib/ai-actions'; // NEW: Direct import for test (server action)

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

  const { session } = useAuth(); // NEW: For userId in test (RLS paths)

  // NEW: Test button for PDF splitting (temporary; remove after validating ai-actions.ts)
  const handleTestSplit = async () => {
    try {
      // Sample signed URL (replace with your Supabase test-data or real upload)
      const testUrl = 'https://uzxnveukrvycwftcfzjl.supabase.co/storage/v1/object/sign/enki-storage/jobs/user_a288c013-35e9-4d16-8313-31804fae9b9b/phase1a/17fd07f6-d9ce-4f69-a6a5-e3f59a0c6f00/sampleContract.pdf?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1cmwiOiJlbmtpLXN0b3JhZ2Uvam9icy91c2VyX2EyODhjMDEzLTM1ZTktNGQxNi04MzEzLTMxODA0ZmFlOWI5Yi9waGFzZTFhLzE3ZmQwN2Y2LWQ5Y2UtNGY2OS1hNmE1LWUzZjU5YTBjNmYwMC9zYW1wbGVDb250cmFjdC5wZGYiLCJpYXQiOjE3NjkxOTA5MzgsImV4cCI6MTc3MTc4MjkzOH0.FqHXOMDdpAJLD4j-O2aJOZAvT40fZDijdMdU9Z9sYzI'; // Replace with real URL or Supabase signed URL (e.g., from your test-data or storage)
      const userId = session?.user?.id; // NEW: From session for Supabase path (RLS: user_<uid>)
      const results = await parseFilesAction([testUrl], 'phase1a', userId); // UPDATED: Remove extra 'split' arg (expects 1-3: fileUrls, focus?, userId?)
      console.log('Test Split Results:', results);
      toast.success('PDF split—check Supabase sections and console for URLs');
    } catch (err) {
      console.error('Test split error:', err);
      toast.error('Split test failed—check console');
    }
  };

  return (
    <div className="container mx-auto p-4">
      <PhaseLayout
        title="Phase 1A: Pre-Bid Subcontract Protection"
        description="Drag-drop subcontract + proposal + emails → parse essentials → consolidate scope (CSI codes, qtys, deltas) → flag risks/misses → generate protective exhibits/clauses."
        loading={loading} // Pass to PhaseLayout for centralized handling
        error={error}
        risks={risks}
        generatedItems={generatedItems}
        parsedEssentials={parsedEssentials}
        handleUpload={handleUpload}
        generateType="exhibits"
        onEmailClick={() => toast.success('Stub: One-click email protected exhibits to GC')} // Optional: Phase-specific stub
      />
      {/* NEW: Temporary test button for PDF splitting (validate ai-actions.ts; remove post-test) */}
      <Button onClick={handleTestSplit} variant="secondary" className="mt-4">
        Test PDF Split (Temp)
      </Button>
    </div>
  );
}

// Note: This page is fully centralized via PHASE_CONFIGS and usePhaseUpload hook.
// For custom overrides (e.g., onGenerateCustom for unique generation logic), add them here or in PHASE_CONFIGS.
// The test button is temporary—remove after validating PDF splitting in ai-actions.ts.