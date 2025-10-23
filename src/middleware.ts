import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createRouteHandlerSupabaseClient } from "@/lib/supabase/server";
import { TENANT_COOKIE, TENANT_HEADER } from "@/lib/tenant/constants";
import { env } from "@/lib/env";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next({ request: { headers: request.headers } });

  // --- DEMO MODE: Skip auth for development
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

  if (isDemoMode) {
    console.log(`[Demo Mode] Allowing access to ${pathname} without authentication`);
    // Set demo tenant in headers so app functions
    response.headers.set(TENANT_HEADER, 'demo-tenant-1');
    return response;
  }

  // --- PRODUCTION MODE: Full authentication
  const supabase = createRouteHandlerSupabaseClient(request, response);

  // Validate user authentication securely
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  // --- Tenant Context
  // First check if user has a tenant cookie set
  let tenantId = request.cookies.get(TENANT_COOKIE)?.value;

  // If user is logged in but no tenant cookie, fetch their first tenant
  if (user && !tenantId) {
    try {
      const { data: memberships } = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (memberships?.tenant_id) {
        tenantId = memberships.tenant_id;
        // Set the cookie for future requests
        response.cookies.set(TENANT_COOKIE, tenantId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365, // 1 year
        });
        console.log(`[Middleware] Auto-selected tenant ${tenantId} for user ${user.id}`);
      }
    } catch (error) {
      console.error('[Middleware] Failed to fetch user tenant:', error);
    }
  }

  // Set tenant header for API routes
  if (tenantId) {
    response.headers.set(TENANT_HEADER, tenantId);
  }

  // --- Route Protection
  const isLoggedIn = !!user;
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  if (!isLoggedIn && isDashboardRoute) {
    // Redirect unauthenticated users from protected routes to the login page
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isLoggedIn && isAuthRoute) {
    // Redirect authenticated users from auth routes to the dashboard
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
