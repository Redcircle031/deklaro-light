import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { createServerSupabaseClient, setTenantCookie } from "@/lib/supabase";
import type { TenantRecord } from "@/lib/supabase";

function toTenantRecord(row: {
  tenants: {
    id: string;
    name: string;
    slug: string;
    created_at: string;
  } | null;
  role: string;
}): TenantRecord {
  if (!row.tenants) {
    throw new Error("Missing tenant relation for membership record.");
  }

  return {
    id: row.tenants.id,
    name: row.tenants.name,
    slug: row.tenants.slug,
    createdAt: row.tenants.created_at,
    role: row.role as TenantRecord["role"],
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { tenantId } = await request.json();

  if (!tenantId) {
    return NextResponse.json({ error: "tenantId is required" }, { status: 400 });
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("tenant_members")
    .select("role, tenants:tenants(id, name, slug, created_at)")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const tenant = toTenantRecord(data);
  const response = NextResponse.json({ tenant });

  setTenantCookie(response, tenant.id);

  return response;
}
