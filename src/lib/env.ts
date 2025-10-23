const requiredEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

type RequiredEnvKey = (typeof requiredEnvKeys)[number];

const optionalEnv: Record<string, string | undefined> = {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  WEIS_API_KEY: process.env.WEIS_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  GOOGLE_OAUTH_CLIENT_ID: process.env.GOOGLE_OAUTH_CLIENT_ID,
  GOOGLE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  KSEF_CERTIFICATE_PATH: process.env.KSEF_CERTIFICATE_PATH,
  KSEF_CERTIFICATE_PASSWORD: process.env.KSEF_CERTIFICATE_PASSWORD,
};

// Direct access to environment variables (required for Next.js webpack replacement)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// Validate environment variables
if (!supabaseUrl || supabaseUrl.includes('YOUR_SUPABASE')) {
  console.warn(
    'Missing or placeholder environment variable: NEXT_PUBLIC_SUPABASE_URL. Using demo mode. Configure Supabase to enable auth.',
  );
}

if (!supabaseAnonKey || supabaseAnonKey.includes('YOUR_SUPABASE')) {
  console.warn(
    'Missing or placeholder environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY. Using demo mode. Configure Supabase to enable auth.',
  );
}

export const env = {
  supabaseUrl: supabaseUrl || 'https://demo.supabase.co',
  supabaseAnonKey: supabaseAnonKey || 'demo-key',
  optional: optionalEnv,
  isConfigured: !!(supabaseUrl && !supabaseUrl.includes('demo')),
  isDemoMode: demoMode,
};

export type Env = typeof env;
