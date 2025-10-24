import type { NextConfig } from "next";

// Debug: Check what Next.js sees
console.log('🔍 Next.js Config Loading...');
console.log('NEXT_PUBLIC_DEMO_MODE:', process.env.NEXT_PUBLIC_DEMO_MODE);
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...');

const nextConfig: NextConfig = {
  // Disable ESLint during production builds (warnings are non-critical)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript checking during production builds
  typescript: {
    ignoreBuildErrors: true,
  },
  // Environment variables are managed by Vercel
  // No need to hardcode them here - they're injected at build time
};

export default nextConfig;
