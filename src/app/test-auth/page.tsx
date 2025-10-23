'use client';

import { useState } from 'react';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';

export default function TestAuthPage() {
  const [status, setStatus] = useState<string>('Ready to test...');
  const [details, setDetails] = useState<Record<string, unknown> | null>(null);

  const testLogin = async () => {
    setStatus('Testing login...');
    try {
      const supabase = getBrowserSupabaseClient();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@deklaro.com',
        password: 'Test123456789',
      });

      if (error) {
        setStatus(`❌ Login failed: ${error.message}`);
        setDetails(error);
      } else {
        setStatus('✅ Login successful!');
        setDetails(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setStatus(`❌ Network error: ${errorMessage}`);
      setDetails(err as Record<string, unknown>);
      console.error('Full error:', err);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>

      <div className="mb-4">
        <button
          onClick={testLogin}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Login (test@deklaro.com)
        </button>
      </div>

      <div className="mb-4">
        <h2 className="font-semibold">Status:</h2>
        <p className="text-lg">{status}</p>
      </div>

      {details ? (
        <div className="mb-4">
          <h2 className="font-semibold">Details:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      ) : null}

      <div className="text-sm text-gray-600">
        <p>Test credentials:</p>
        <p>Email: test@deklaro.com</p>
        <p>Password: Test123456789</p>
        <p>User ID: 87dd27e9-1c0b-49f7-bc8a-aab4ce10e99d</p>
      </div>
    </div>
  );
}
