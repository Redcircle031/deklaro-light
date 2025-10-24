"use client";

import { useState } from "react";
import type { Invoice } from "@prisma/client";
import { InvoiceUploader } from "./InvoiceUploader";

export function InvoiceClientPage({
  initialInvoices,
}: {
  initialInvoices: Invoice[];
}) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);

  const handleUploadSuccess = (newInvoice: Invoice) => {
    setInvoices((prevInvoices) => [newInvoice, ...prevInvoices]);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Invoices</h1>
        <p className="mt-2 text-slate-600">
          Upload and manage your company invoices.
        </p>
      </div>

      <InvoiceUploader onUploadSuccess={handleUploadSuccess} />

      <div className="rounded-lg border border-slate-200 bg-white">
        <ul className="divide-y divide-slate-200">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="px-6 py-4">
              <p className="font-mono text-sm">{invoice.originalFileUrl}</p>
              <p className="text-xs text-slate-500">Status: {invoice.status}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}