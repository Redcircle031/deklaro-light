import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { env } from "../env";
import type { Database } from "./types";

const cookieName = "sb-access-token";

function mapCookieRecord({
  name,
  value,
  ...options
}: {
  name: string;
  value: string;
  expires?: Date;
  maxAge?: number;
  path?: string;
  sameSite?: "strict" | "lax" | "none";
  httpOnly?: boolean;
  secure?: boolean;
}) {
  return {
    name,
    value,
    options,
  };
}

export async function createServerSupabaseClient(
  cookieOverrides?: Awaited<ReturnType<typeof cookies>>,
): Promise<SupabaseClient<Database>> {
  const cookieStore = cookieOverrides ?? (await cookies());

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll().map((cookie) => mapCookieRecord(cookie));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          if ("set" in cookieStore && typeof cookieStore.set === "function") {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              if (process.env.NODE_ENV === "development") {
                console.warn(
                  `[Supabase] Unable to set cookie "${name}" in this context. This is expected inside Server Components without mutable cookies.`,
                  error,
                );
              }
            }
          }
        });
      },
    },
  });
}

export function createRouteHandlerSupabaseClient(
  request: NextRequest,
  response: NextResponse,
): SupabaseClient<Database> {
  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll().map((cookie) => mapCookieRecord(cookie));
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set({
            name,
            value,
            ...options,
          });
        });
      },
    },
  });
}

/**
 * Utility helper to fetch the current Supabase user on the server.
 * DEPRECATED: Use getServerUser() instead for better security.
 * @deprecated
 */
export async function getServerSession() {
  console.warn('[Deprecated] getServerSession() is deprecated. Use getServerUser() instead.');
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  // Return a session-like object for backwards compatibility
  return {
    user: data.user,
    access_token: '', // Not available from getUser()
    refresh_token: '',
  };
}

export async function getServerUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data.user;
}

export async function getAccessTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(cookieName)?.value ?? null;
}

// Alias for convenience (used in OCR worker and API routes)
export const getServerSupabaseClient = createServerSupabaseClient;
export const createClient = createServerSupabaseClient;
