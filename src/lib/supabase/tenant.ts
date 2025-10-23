import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

import { TENANT_COOKIE, TENANT_HEADER } from "@/lib/tenant/constants";

export { TENANT_COOKIE, TENANT_HEADER };

export async function readTenantFromHeaders() {
  const headerStore = await headers();
  return headerStore.get(TENANT_HEADER);
}

export async function readTenantFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(TENANT_COOKIE)?.value ?? null;
}

export async function getTenantContext(request?: NextRequest) {
  const [headerTenant, cookieTenant] = await Promise.all([
    request?.headers.get(TENANT_HEADER) ?? readTenantFromHeaders(),
    request?.cookies.get(TENANT_COOKIE)?.value ?? readTenantFromCookies(),
  ]);

  return {
    tenantId: headerTenant ?? cookieTenant,
  };
}

export function setTenantCookie(response: NextResponse, tenantId: string) {
  response.cookies.set({
    name: TENANT_COOKIE,
    value: tenantId,
    path: "/",
    sameSite: "lax",
  });
}

export function clearTenantCookie(response: NextResponse) {
  response.cookies.set({
    name: TENANT_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
}
