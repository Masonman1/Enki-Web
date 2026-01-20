// scripts/export-supabase-schema.ts (Node.js script for Supabase schema export; run with: npx ts-node scripts/export-supabase-schema.ts)
import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function fetchBuckets(): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc('get_buckets_with_rls_policies');
  if (error) throw error;
  return data as Record<string, unknown>[];
}

async function fetchTables(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) throw error;
  return data as string[];
}

async function fetchColumns(table: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc('get_columns', { tablename: table });
  if (error) throw error;
  return data as Record<string, unknown>[];
}

async function fetchRlsPolicies(table: string): Promise<Record<string, unknown>[]> {
  const { data, error } = await supabase.rpc('get_rls_policies', { tablename: table });
  if (error) throw error;
  return data as Record<string, unknown>[];
}

async function exportSchema() {
  try {
    const config: Record<string, unknown> = {
      buckets: {},
      tables: {},
      last_updated: new Date().toISOString(),
      changes: [],
    };

    // Fetch buckets
    const buckets = await fetchBuckets();
    for (const bucket of buckets) {
      const bucketName = bucket.bucket_name as string;
      config.buckets[bucketName] = {
        structure: bucket.structure as string,
        permissions: bucket.permissions as string,
        rls_policies: bucket.rls_policies as Record<string, unknown>[],
      };
    }

    // Fetch tables
    const tables = await fetchTables();
    for (const table of tables) {
      const columns = await fetchColumns(table);
      const policies = await fetchRlsPolicies(table);
      config.tables[table] = {
        columns,
        rls_policies: policies,
      };
    }

    // Write to file
    const outputPath = path.join(process.cwd(), 'supabase-config.json');
    await fs.writeFile(outputPath, JSON.stringify(config, null, 2));
    console.log(`Schema exported to ${outputPath}`);
  } catch (error) {
    console.error('Export error:', error);
  }
}

exportSchema();