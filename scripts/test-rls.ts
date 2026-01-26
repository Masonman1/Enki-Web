import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Use anon for user sim

// Replace with your test user's email/pass
const TEST_EMAIL = 'jim@wwaterproofingllc.com';
const TEST_PASS = 'Masonman1!'; // Update with actual

async function testStandardUserInsert() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Sign in as standard user
  const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASS,
  });
  if (signInError) {
    console.error('Sign-in error:', signInError.message);
    return;
  }
  console.log('Signed in as:', session.user.email);

  // Test 1: INSERT into job_drafts (should succeed with explicit user_id)
  const { data: draftData, error: draftError } = await supabase
    .from('job_drafts')
    .insert({ user_id: session.user.id, draft_json: { test: 'draft' } }) // Explicit user_id to match RLS
    .select();
  if (draftError) console.error('job_drafts INSERT error:', draftError.message);
  else console.log('job_drafts INSERT success:', draftData);

  // Test 2: INSERT into risk_triggers (should fail)
  const { data: triggerData, error: triggerError } = await supabase
    .from('risk_triggers')
    .insert({ trigger_name: 'Test Trigger', severity: 'low', clause_template: 'Test clause' })
    .select();
  if (triggerError) console.log('risk_triggers INSERT failed (expected):', triggerError.message);
  else console.log('risk_triggers INSERT success (unexpected):', triggerData); // Should not happen

  // Clean up: Delete test draft if inserted
  if (draftData && draftData[0]) {
    await supabase.from('job_drafts').delete().eq('id', draftData[0].id);
  }

  // Sign out
  await supabase.auth.signOut();
}

(async () => {
  await testStandardUserInsert();
})();