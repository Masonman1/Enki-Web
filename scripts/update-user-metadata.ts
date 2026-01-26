import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

async function updateUserMetadata(userId: string) {
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role: 'admin' }  // Merges with existing (e.g., keeps email_verified)
  });
  if (error) console.error('Update error:', error.message);
  else console.log('Metadata updated successfully');
}

(async () => {
  await updateUserMetadata('a288c013-35e9-4d16-8313-31804fae9b9b');  // Your user ID
})();