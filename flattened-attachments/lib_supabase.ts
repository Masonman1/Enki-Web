import { createBrowserClient } from '@supabase/ssr';

// Global singleton instance (lazy-initialized)
let supabaseSingleton: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // SSR/fallback: Return null or throw if needed (Phase 1 is client-focused)
    return null;
  }

  if (!supabaseSingleton) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !anonKey) {
      console.error('Supabase env vars missing');
      return null;
    }

    console.log('Env check: URL =', url, 'ANON_KEY =', anonKey); // Debug as in your log
    supabaseSingleton = createBrowserClient(url, anonKey);
  }

  return supabaseSingleton;
}

// Hook for React components (now shares the singleton)
export function useSupabase() {
  return getSupabaseClient();
}