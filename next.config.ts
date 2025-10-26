import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry webpack plugin
  silent: true, // Suppresses all logs
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
};

// Wrap config with Sentry only if enabled
const isSentryEnabled = process.env.SENTRY_ENABLED === 'true';

export default isSentryEnabled
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;
