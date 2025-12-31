/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
  reactStrictMode: true, // Enables strict mode for better dev warnings in Phase 1 UI (e.g., upload zone reactivity)
  output: 'standalone', // For Vercel deployment in Phase 1 (self-contained bundle)
};

export default nextConfig;