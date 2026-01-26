import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function clearBucket(bucketName: string, prefix: string = '') {
  let offset = 0;
  const limit = 1000; // Supabase max per call
  let totalCleared = 0;

  try {
    while (true) {
      const { data: files, error: listError } = await supabase.storage
        .from(bucketName)
        .list(prefix, { limit, offset });

      if (listError) throw listError;
      if (!files || files.length === 0) break; // Done

      // Handle files and "folders" (prefixes)
      const pathsToDelete: string[] = [];
      for (const item of files) {
        const itemPath = prefix ? `${prefix}${item.name}` : item.name;
        if (item.id) {
          // File: Queue for delete
          pathsToDelete.push(itemPath);
        } else {
          // "Folder" (prefix): Recurse
          await clearBucket(bucketName, `${itemPath}/`); // Recursive call
        }
      }

      // Delete files in batch
      if (pathsToDelete.length > 0) {
        const { error: deleteError } = await supabase.storage.from(bucketName).remove(pathsToDelete);
        if (deleteError) throw deleteError;
        totalCleared += pathsToDelete.length;
        console.log(`Cleared ${pathsToDelete.length} files under '${prefix}'`);
      }

      offset += limit; // Paginate
    }

    console.log(`Total cleared under '${prefix}': ${totalCleared}`);
  } catch (err) {
    console.error('Clear error:', (err as Error).message);
  }
}

(async () => {
  await clearBucket('enki-storage'); // Starts at root; recurses into "folders"
})();