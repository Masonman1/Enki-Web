// lib/ai-actions/storage-utils.ts
// Extracted Supabase storage and DB updates (removed updateJobRisks per schema)

import { SupabaseClient } from '@supabase/supabase-js'; // Add this for typing
import { v4 as uuidv4 } from 'uuid';

export async function uploadSplitPdfs(supabase: SupabaseClient, userId: string, focus: string, splitBuffers: Record<string, Buffer>): Promise<string | null> {
  const basePath = `${focus}/user_${userId}/${uuidv4()}`; // RLS-aligned
  let storagePath: string | null = null;

  for (const [section, buffer] of Object.entries(splitBuffers)) {
    const path = `${basePath}/${section}.pdf`;
    const { error } = await supabase.storage.from('enki-storage').upload(path, buffer, { contentType: 'application/pdf' });
    if (error) {
      console.error(`Upload failed for ${section}: ${error.message}`);
      return null;
    }
    storagePath = basePath; // Use base for reference
  }

  return storagePath;
}

export async function uploadOriginalFile(supabase: SupabaseClient, userId: string, focus: string, buffer: Buffer, fileName: string): Promise<string | null> {
  const basePath = `${focus}/user_${userId}/${uuidv4()}`;
  const path = `${basePath}/${fileName}`;
  const contentType = fileName.endsWith('.msg') ? 'application/vnd.ms-outlook' : 'application/octet-stream'; // Specific for .msg

  const { error } = await supabase.storage.from('enki-storage').upload(path, buffer, { contentType });
  if (error) {
    console.error(`Upload failed for ${fileName}: ${error.message}`);
    return null;
  }
  return basePath; // Return base for reference (consistent with splits)
}

// Removed updateJobRisks — no risks column in jobs; risks transient