import { createBrowserClient } from "@supabase/ssr";
import type { AuthChangeEvent, Session, SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";
import type { Database } from "./types";

let browserClient: SupabaseClient<Database> | null = null;

export function getBrowserSupabaseClient() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return browserClient;
}

export type AuthStateCallback = (event: AuthChangeEvent, session: Session | null) => void;

/**
 * Subscribes to Supabase auth state changes. Useful for triggering react-query
 * invalidations or updating UI when a session refresh occurs.
 */
export function onBrowserAuthStateChange(callback: AuthStateCallback) {
  const client = getBrowserSupabaseClient();

  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return () => {
    subscription.unsubscribe();
  };
}
