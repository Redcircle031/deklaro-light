'use client';

import { useEffect, useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export default function TestSupabasePage() {
  const [status, setStatus] = useState<string>('Testing...');
  const [config, setConfig] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Check environment variables
        const envVars = {
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        };
        setConfig(envVars);

        // Test Supabase client
        const supabase = getBrowserSupabaseClient();

        // Try a simple health check
        const { error } = await supabase.auth.getSession();

        if (error) {
          setStatus(`Error: ${error.message}`);
        } else {
          setStatus('✅ Supabase connection successful!');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setStatus(`❌ Connection failed: ${errorMessage}`);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>

      <div className="mb-4">
        <h2 className="font-semibold">Status:</h2>
        <p className="text-lg">{status}</p>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold">Configuration:</h2>
        <pre className="bg-gray-100 p-4 rounded overflow-auto">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold">Expected URL:</h2>
        <p>https://deljxsvywkbewwsdawqj.supabase.co</p>
      </div>
    </div>
  );
}
