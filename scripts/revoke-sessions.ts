import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function revokeUserSessions(userId: string) {
  try {
    const { error } = await supabase.auth.admin.signOutAll(userId);
    if (error) console.error('Revoke error:', error.message);
    else console.log(`All sessions revoked for user ${userId}`);
  } catch (err) {
    console.error('Script error:', err);
  }
}

(async () => {
  const USER_ID = 'a288c013-35e9-4d16-8313-31804fae9b9b'; // Your main user ID from raw JSON
  await revokeUserSessions(USER_ID);
})();