// scripts/export-supabase-schema.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import dotenv from 'dotenv'; // For loading .env.local
import path from 'path'; // Built-in for paths

// Load env vars from .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function exportSchema() {
  const output: any = {
    buckets: {},
    tables: {},
    last_updated: new Date().toISOString(),
    changes: [], // Manually add notes or automate from git log later
  };

  // Fetch buckets and structure
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  if (bucketsError) throw bucketsError;
  for (const bucket of buckets) {
    const { data: objects, error: objectsError } = await supabase.storage.from(bucket.id).list('', { limit: 10 }); // Sample paths for structure inference
    if (objectsError) throw objectsError;
    output.buckets[bucket.id] = {
      structure: objects?.map(o => o.name.replace(/^[a-f0-9-]{36}/, 'user_{id}'))?.join(', ') || 'Empty', // Anonymize user IDs in paths
      permissions: bucket.public ? 'Public' : 'Private', // Expand with policies
    };
    // Fetch RLS-like policies (storage.objects table)
    const { data: policies, error: policiesError } = await supabase.rpc('get_policies_for_table', { schema_name: 'storage', table_name: 'objects' });
    if (policiesError) throw policiesError;
    output.buckets[bucket.id].rls_policies = policies || [];
  }

  // Fetch tables via RPC (create in Supabase dashboard if not exists)
  try {
    const { data: tablesData, error: tablesError } = await supabase.rpc('get_tables', { schema_name: 'public' });
    if (tablesError) throw tablesError;
    const tables = tablesData?.map((t: any) => t) || []; // SETOF text returns array of strings
    console.log('Tables fetched:', tables); // Debug: Should show ['jobs', 'products', 'dev_logs']

    for (const table_name of tables) {
      // Fetch columns via RPC (uncommented)
      const { data: columnsData, error: columnsError } = await supabase.rpc('get_columns', { schema_name: 'public', table_name });
      if (columnsError) throw columnsError;
      output.tables[table_name] = {
        columns: columnsData?.map((c: any) => `${c.column_name}: ${c.data_type}`) || [],
      };
      // Fetch RLS policies
      const { data: rls, error: rlsError } = await supabase.rpc('get_policies_for_table', { schema_name: 'public', table_name });
      if (rlsError) throw rlsError;
      output.tables[table_name].rls_policies = rls || [];
    }
  } catch (tablesFetchError) {
    console.error('Tables fetch error:', tablesFetchError);
  }

  // Write to file
  console.log('Final output before write:', JSON.stringify(output, null, 2)); // Debug: See full JSON
  const filePath = path.join(process.cwd(), 'supabase-config.json');
  console.log('Writing to:', filePath); // Debug: Confirm path
  try {
    await fs.writeFile(filePath, JSON.stringify(output, null, 2));
    console.log(`Schema exported to ${filePath}`);
  } catch (writeError) {
    console.error('Write error:', writeError); // Catch fs issues
  }
}

exportSchema().catch(console.error);