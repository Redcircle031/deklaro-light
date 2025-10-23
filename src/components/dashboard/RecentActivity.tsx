"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, Clock, CheckCircle, XCircle } from "lucide-react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  totalAmount: number;
  status: string;
  companyName?: string;
}

export function RecentActivity() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentInvoices() {
      try {
        const response = await fetch("/api/invoices?limit=5&sortBy=createdAt&sortOrder=desc");
        if (response.ok) {
          const data = await response.json();
          setInvoices(data.invoices || []);
        }
      } catch (error) {
        console.error("Failed to fetch recent invoices:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentInvoices();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "PENDING":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PROCESSED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Activity</h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
        <Link
          href="/dashboard/invoices"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View all
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="py-8 text-center text-slate-500">
          <FileText className="mx-auto mb-2 h-12 w-12 text-slate-300" />
          <p>No invoices yet</p>
          <Link
            href="/dashboard/invoices"
            className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700"
          >
            Upload your first invoice
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/dashboard/invoices/${invoice.id}`}
              className="block rounded-lg border border-slate-200 p-4 transition-all hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getStatusIcon(invoice.status)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {invoice.invoiceNumber || "No invoice number"}
                    </p>
                    {invoice.companyName && (
                      <p className="mt-1 text-sm text-slate-500">{invoice.companyName}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {formatDate(invoice.issueDate)}
                    </p>
                  </div>
                </div>
                <div className="ml-4 flex flex-col items-end gap-2">
                  <p className="font-semibold text-slate-900">
                    {formatCurrency(invoice.totalAmount)}
                  </p>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(
                      invoice.status
                    )}`}
                  >
                    {invoice.status}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
