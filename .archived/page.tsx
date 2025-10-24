import { cookies, headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { TENANT_HEADER } from "@/lib/tenant/constants";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";

async function getInvoice(invoiceId: string, tenantId: string) {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        tenantId: tenantId,
      },
      include: {
        ocrJob: true,
      },
    });
    return invoice;
  } catch (error) {
    console.error("Failed to fetch invoice:", error);
    return null;
  }
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const cookieStore = cookies();
  const supabase = createServerSupabaseClient(cookieStore);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const tenantId = headers().get(TENANT_HEADER);

  if (!session || !tenantId) {
    notFound();
  }

  const invoice = await getInvoice(params.id, tenantId);

  if (!invoice) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <Link href="/invoices" className="text-sm text-slate-600 hover:text-slate-900">
        &larr; Back to Invoices
      </Link>
      <h1 className="text-3xl font-bold">Invoice Details</h1>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <h2 className="text-xl font-semibold">Information</h2>
          <p><strong>Status:</strong> {invoice.status}</p>
          <p><strong>Created:</strong> {new Date(invoice.createdAt).toLocaleString()}</p>
          <p className="font-mono text-xs"><strong>ID:</strong> {invoice.id}</p>
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold">Document Preview</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
            <iframe src={invoice.originalFileUrl} className="h-[800px] w-full" title="Invoice Preview" />
          </div>
        </div>
      </div>
    </div>
  );
}