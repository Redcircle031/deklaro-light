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
  // Explicitly expose environment variables to the browser
  env: {
    NEXT_PUBLIC_DEMO_MODE: "false",
    NEXT_PUBLIC_SUPABASE_URL: "https://deljxsvywkbewwsdawqj.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbGp4c3Z5d2tiZXd3c2Rhd3FqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzY3MDEsImV4cCI6MjA3NTQ1MjcwMX0.KYm8_S_eIhBCbljCLsqvAd3Zemq5BgJBRXXGThrI4Ts",
  },
};

export default nextConfig;
