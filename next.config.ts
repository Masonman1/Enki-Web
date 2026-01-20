/** @type {import('next').NextConfig} */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
  reactStrictMode: true, // Enables strict mode for better dev warnings in Phase 1 UI (e.g., upload zone reactivity)
  output: 'standalone', // For Vercel deployment in Phase 1 (self-contained bundle)
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fallback Node.js modules to false on client (browser/SSR) – prevents resolution errors from server-only libs like pdf-parse
      config.resolve.fallback = {
        ...config.resolve.fallback, // Preserve any existing fallbacks
        fs: false,
        http: false,
        https: false,
        url: false,
        // Add more if other pdf.js-related errors appear (e.g., net, tls)
      };
    }
    return config;
  },
  turbopack: {}, // NEW: Empty opt-in to silence mismatch warning (migrate fallbacks to Turbopack API later if needed)
};

export default nextConfig;