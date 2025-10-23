"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Trash2,
  Send,
  Check,
} from "lucide-react";

type InvoiceStatus =
  | "PENDING"
  | "PROCESSING"
  | "PROCESSED"
  | "FAILED"
  | "APPROVED"
  | "SUBMITTED";
type InvoiceType = "PURCHASE" | "SALE" | "EXPENSE";

interface Invoice {
  id: string;
  fileName: string;
  invoiceNumber: string | null;
  issueDate: string | null;
  company: { name: string; nip: string } | null;
  totalAmount: number | null;
  currency: string;
  status: string;
  invoiceType: string | null;
  ocrConfidence: number | null;
  createdAt: string;
}

interface InvoiceTableEnhancedProps {
  initialInvoices: Invoice[];
}

type SortField = "invoiceNumber" | "issueDate" | "totalAmount" | "createdAt" | "status";
type SortOrder = "asc" | "desc";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PROCESSING: "bg-blue-100 text-blue-800 border-blue-200",
  PROCESSED: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  APPROVED: "bg-purple-100 text-purple-800 border-purple-200",
  SUBMITTED: "bg-indigo-100 text-indigo-800 border-indigo-200",
};

export function InvoiceTableEnhanced({ initialInvoices }: InvoiceTableEnhancedProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Filter and sort logic
  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = initialInvoices.filter((invoice) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
        invoice.fileName.toLowerCase().includes(searchLower) ||
        invoice.company?.name.toLowerCase().includes(searchLower) ||
        invoice.company?.nip.includes(searchLower);

      // Status filter
      const matchesStatus =
        statusFilter === "all" || invoice.status === statusFilter;

      // Type filter
      const matchesType =
        typeFilter === "all" || invoice.invoiceType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "invoiceNumber":
          aValue = a.invoiceNumber || "";
          bValue = b.invoiceNumber || "";
          break;
        case "issueDate":
          aValue = a.issueDate ? new Date(a.issueDate).getTime() : 0;
          bValue = b.issueDate ? new Date(b.issueDate).getTime() : 0;
          break;
        case "totalAmount":
          aValue = a.totalAmount || 0;
          bValue = b.totalAmount || 0;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "createdAt":
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [initialInvoices, searchQuery, statusFilter, typeFilter, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredAndSortedInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const toggleSelectAll = () => {
    if (selectedInvoices.size === paginatedInvoices.length) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(paginatedInvoices.map((inv) => inv.id)));
    }
  };

  const toggleSelectInvoice = (id: string) => {
    const newSelected = new Set(selectedInvoices);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedInvoices(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedInvoices.size === 0) return;
    if (confirm(`Delete ${selectedInvoices.size} selected invoices?`)) {
      // TODO: Implement bulk delete API call
      console.log("Delete invoices:", Array.from(selectedInvoices));
    }
  };

  const handleBulkSubmitToKsef = () => {
    if (selectedInvoices.size === 0) return;
    // TODO: Implement bulk KSeF submission
    console.log("Submit to KSeF:", Array.from(selectedInvoices));
  };

  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return "—";
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("pl-PL");
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="inline h-4 w-4" />
    ) : (
      <ChevronDown className="inline h-4 w-4" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="PROCESSED">Processed</option>
            <option value="FAILED">Failed</option>
            <option value="APPROVED">Approved</option>
            <option value="SUBMITTED">Submitted</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="PURCHASE">Purchase</option>
            <option value="SALE">Sale</option>
            <option value="EXPENSE">Expense</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedInvoices.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <span className="text-sm font-medium text-blue-900">
            {selectedInvoices.size} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkSubmitToKsef}
              className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
              Submit to KSeF
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Results Count */}
      <div className="text-sm text-slate-600">
        Showing {filteredAndSortedInvoices.length} of {initialInvoices.length} invoices
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={
                    paginatedInvoices.length > 0 &&
                    selectedInvoices.size === paginatedInvoices.length
                  }
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 hover:bg-slate-100"
                onClick={() => handleSort("invoiceNumber")}
              >
                Invoice # <SortIcon field="invoiceNumber" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Company
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 hover:bg-slate-100"
                onClick={() => handleSort("issueDate")}
              >
                Date <SortIcon field="issueDate" />
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 hover:bg-slate-100"
                onClick={() => handleSort("totalAmount")}
              >
                Amount <SortIcon field="totalAmount" />
              </th>
              <th
                className="cursor-pointer px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500 hover:bg-slate-100"
                onClick={() => handleSort("status")}
              >
                Status <SortIcon field="status" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Confidence
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {paginatedInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  {searchQuery || statusFilter !== "all" || typeFilter !== "all"
                    ? "No invoices match your filters"
                    : "No invoices found. Upload your first invoice to get started!"}
                </td>
              </tr>
            ) : (
              paginatedInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="transition-colors hover:bg-slate-50"
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedInvoices.has(invoice.id)}
                      onChange={() => toggleSelectInvoice(invoice.id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      {invoice.invoiceNumber || invoice.fileName}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    {invoice.company ? (
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {invoice.company.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          NIP: {invoice.company.nip}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-900">
                    {formatDate(invoice.issueDate)}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">
                    {formatCurrency(invoice.totalAmount, invoice.currency)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_COLORS[invoice.status] || "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {invoice.ocrConfidence !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-slate-200">
                          <div
                            className={`h-full rounded-full ${
                              invoice.ocrConfidence >= 0.9
                                ? "bg-green-600"
                                : invoice.ocrConfidence >= 0.75
                                ? "bg-yellow-600"
                                : "bg-red-600"
                            }`}
                            style={{
                              width: `${invoice.ocrConfidence * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-600">
                          {Math.round(invoice.ocrConfidence * 100)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
