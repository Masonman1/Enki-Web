/** @type {import('next').NextConfig} */
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disabled for dev to reduce double-renders/delays (re-enable for prod warnings if needed)
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
        elliptic: false, // From earlier vuln fixes (crypto primitive risks)
        crypto: false, // From crypto-browserify/node-libs-browser vulns
        browserify: false, // From browserify-sign vuln chain
        // Add more if other pdf.js-related errors appear (e.g., net: false, tls: false, zlib: false)
      };
    }
    return config;
  }
};

export default nextConfig;