import { NextResponse, type NextRequest } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { TENANT_HEADER } from "@/lib/tenant/constants";

/**
 * GET /api/invoices/[id]
 * Retrieves a single invoice by its ID.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const tenantId = headers().get(TENANT_HEADER);
  if (!tenantId) {
    return new NextResponse("No active tenant found", { status: 400 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: params.id,
      tenantId: tenantId, // RLS also enforces this, but it's good practice
    },
    include: {
      items: true, // Include line items
      ocrJob: true,
    },
  });

  if (!invoice) {
    return new NextResponse("Invoice not found", { status: 404 });
  }

  return NextResponse.json(invoice);
}

/**
 * PUT /api/invoices/[id]
 * Updates an existing invoice.
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const tenantId = headers().get(TENANT_HEADER);
  if (!tenantId) {
    return new NextResponse("No active tenant found", { status: 400 });
  }

  const body = await request.json();
  // Exclude fields that should not be updated directly via this endpoint
  const { id, tenantId: bodyTenantId, ...updateData } = body;

  const updatedInvoice = await prisma.invoice.updateMany({
    where: {
      id: params.id,
      tenantId: tenantId,
    },
    data: updateData,
  });

  return NextResponse.json(updatedInvoice);
}