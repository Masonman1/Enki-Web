import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Use your standard test user creds (non-admin for ownership test)
const TEST_EMAIL = 'jim@wwaterproofingllc.com';
const TEST_PASS = 'Masonman1!'; // Update with actual

async function testStorageUpload() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Sign in
  const { data: { session }, error: signInError } = await supabase.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASS });
  if (signInError) return console.error('Sign-in error:', signInError.message);
  console.log('Signed in as:', session.user.email);

  // Test upload to user-specific path (simulates Enki raw_uploads for pre-bid files)
  const testFile = new Blob(['dummy waterproofing subcontract content'], { type: 'text/plain' });
  const testPath = `drafts/user_${session.user.id}/test_${Date.now()}.txt`;
  const { data: uploadData, error: uploadError } = await supabase.storage.from('enki-storage').upload(testPath, testFile);
  if (uploadError) console.error('Upload error:', uploadError.message);
  else console.log('Upload success:', uploadData.path);

  // Test signed URL (for secure Enki UI access, e.g., "View Original Proposal")
  const { data: signedData, error: signedError } = await supabase.storage.from('enki-storage').createSignedUrl(testPath, 60); // 1 min expiry
  if (signedError) console.error('Signed URL error:', signedError.message);
  else console.log('Signed URL:', signedData.signedUrl);

  // Test delete (should succeed as path owner per RLS)
  const { error: deleteError } = await supabase.storage.from('enki-storage').remove([testPath]);
  if (deleteError) console.error('Delete error:', deleteError.message);
  else console.log('Delete success');

  await supabase.auth.signOut();
}

(async () => {
  await testStorageUpload();
})();