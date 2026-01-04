import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('Loaded env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE'))); // Debug: Show Supabase-related keys

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing vars - URL:', supabaseUrl, 'SERVICE_KEY:', supabaseServiceKey ? '[set]' : '[unset]');
  throw new Error('Missing SUPABASE_URL or SERVICE_KEY in .env.local');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function uploadLogs() {
  try {
    const jsonData = await fs.readFile('logs/ChatSummaries.json', 'utf8');
    const chatSummaries = JSON.parse(jsonData);
    const summariesArray = chatSummaries.summaries || chatSummaries;

    const userId = 'a288c013-35e9-4d16-8313-31804fae9b9b'; // Replace

    const { data, error } = await supabase
      .from('dev_logs')
      .upsert({
        user_id: userId,
        summaries: summariesArray
      }, { onConflict: 'user_id' });

    if (error) console.error('Upload error:', error.message);
    else console.log('Logs uploaded:', data);
  } catch (err) {
    console.error('Script error:', err);
  }
}

uploadLogs();