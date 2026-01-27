// app/phase1b/page.tsx (UPDATED: Refactored to centralized Phase 1 patterns; types auth listener to fix implicit 'any' TS error; guest mode preserved)
'use client';

import { usePhaseUpload } from '@/lib/phase-hook';
import PhaseLayout from '@/components/phase-layout';
import { PHASE_CONFIGS } from '@/lib/phase-config'; // NEW: Centralized configs
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/use-auth'; // NEW: For optional session (guest mode skips redirect)
import { AuthChangeEvent, Session } from '@supabase/supabase-js'; // NEW: For typing auth listener
import { useRouter } from 'next/navigation';
import { useSupabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';

export default function Phase1B() {
  const config = PHASE_CONFIGS['phase1b']; // NEW: Fetch by key (focus: 'phase1b', generateType: 'notes', etc.)
  const { 
    error, 
    risks, 
    generatedItems, 
    parsedEssentials, 
    handleUpload, 
    loading 
  } = usePhaseUpload(config); // NEW: Centralized hook for upload/parse/generate

  const { session } = useAuth(); // Optional for guest
  const router = useRouter();
  const supabase = useSupabase();
  const [localSession, setLocalSession] = useState<Session | null>(null); // Local for guest handling

  useEffect(() => {
    async function getSession() {
      const { data: { session } } = await supabase.auth.getSession();
      setLocalSession(session);
    }
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => { // UPDATED: Typed params to fix TS error
      setLocalSession(session);
    });

    return () => authListener.subscription.unsubscribe();
  }, [router, supabase]);

  return (
    <div className="container mx-auto p-4">
      <PhaseLayout // NEW: Reuse layout for consistency
        title="Phase 1B: Job Setup/Submittals as Guest"
        description="Drag-drop docs → parse essentials → generate review notes/warranties for submittals."
        loading={loading}
        error={error}
        risks={risks}
        generatedItems={generatedItems}
        parsedEssentials={parsedEssentials}
        handleUpload={handleUpload}
        generateType="notes"
        onEmailClick={() => toast.success('Stub: One-click email submittal review/warranty')}
      />
    </div>
  );
}