import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { env } from "@/lib/env";
import { createServerSupabaseClient, setTenantCookie } from "@/lib/supabase";
import type { TenantRecord, TenantRole } from "@/lib/supabase";
import { ensureTenantSlug } from "@/lib/utils/slugify";

function mapTenantRecord(row: {
  tenants: {
    id: string;
    name: string;
    slug: string;
    created_at: string;
  } | null;
  role: TenantRole;
}) {
  if (!row.tenants) {
    throw new Error("Tenant relation missing from membership row.");
  }

  return {
    id: row.tenants.id,
    name: row.tenants.name,
    slug: row.tenants.slug,
    createdAt: row.tenants.created_at,
    role: row.role,
  } satisfies TenantRecord;
}

export async function GET() {
  // In demo mode, return mock tenants
  if (!env.isConfigured) {
    return NextResponse.json({
      tenants: [
        {
          id: "demo-tenant-1",
          name: "Demo Company",
          slug: "demo-company",
          createdAt: new Date().toISOString(),
          role: "OWNER" as TenantRole,
        },
      ],
    });
  }

  const supabase = (await createServerSupabaseClient()) as unknown as SupabaseClient<Record<string, unknown>>;
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
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[/api/tenants] Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.log(`[/api/tenants] Found ${data?.length || 0} tenant(s) for user ${user.id}`);

  const tenants = (data ?? []).map(mapTenantRecord);

  return NextResponse.json({
    tenants,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  // In demo mode, return mock tenant creation
  if (!env.isConfigured) {
    const name = String(body?.name ?? "").trim();
    if (name.length < 3) {
      return NextResponse.json(
        { error: "Tenant name must be at least 3 characters." },
        { status: 422 },
      );
    }

    return NextResponse.json({
      tenant: {
        id: `demo-tenant-${Date.now()}`,
        name,
        slug: name.toLowerCase().replace(/\s+/g, "-"),
        createdAt: new Date().toISOString(),
        role: "OWNER" as const,
      },
    });
  }

  const supabase = (await createServerSupabaseClient()) as unknown as SupabaseClient<Record<string, unknown>>;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = String(body?.name ?? "").trim();
  const inputSlug = String(body?.slug ?? "").trim();

  if (name.length < 3) {
    return NextResponse.json(
      { error: "Tenant name must be at least 3 characters." },
      { status: 422 },
    );
  }

  const { data: existing } = await supabase
    .from("tenants")
    .select("slug");

  const existingSlugs = ((existing ?? []) as Array<{ slug: string }>).map((row) => row.slug);
  const slug = inputSlug.length > 0
    ? ensureTenantSlug(inputSlug, existingSlugs)
    : ensureTenantSlug(name, existingSlugs);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tenantsTable = supabase.from("tenants") as any;
  const { data: tenantInsert, error: insertError } = await tenantsTable
    .insert({
      name,
      slug,
    })
    .select()
    .single();

  if (insertError || !tenantInsert) {
    return NextResponse.json(
      { error: insertError?.message ?? "Unable to create tenant." },
      { status: 400 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membershipsTable = supabase.from("tenant_members") as any;
  const { error: memberError } = await membershipsTable.insert({
    tenant_id: tenantInsert.id,
    user_id: user.id,
    role: "OWNER",
  });

  if (memberError) {
    await supabase.from("tenants").delete().eq("id", tenantInsert.id);
    return NextResponse.json(
      { error: memberError.message },
      { status: 400 },
    );
  }

  const response = NextResponse.json({
    tenant: {
      id: tenantInsert.id,
      name: tenantInsert.name,
      slug: tenantInsert.slug,
      createdAt: tenantInsert.created_at,
      role: "OWNER" as const,
    },
  });

  setTenantCookie(response, tenantInsert.id);

  return response;
}







