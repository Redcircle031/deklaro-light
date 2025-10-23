'use client';

import { useState } from 'react';
import Link from 'next/link';

type InvoiceStatus = 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'REVIEWING' | 'APPROVED' | 'SUBMITTED' | 'COMPLETED' | 'ERROR';
type InvoiceType = 'INCOMING' | 'OUTGOING';

interface Invoice {
  id: string;
  fileName: string;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  company: { name: string; nip: string } | null;
  grossAmount: number | null;
  currency: string;
  status: string;
  invoiceType: string | null;
  ocrConfidence: number | null;
  createdAt: string;
}

interface InvoiceListProps {
  initialInvoices: Invoice[];
}

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  UPLOADED: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  PROCESSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  PROCESSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  REVIEWING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  SUBMITTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  COMPLETED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  ERROR: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
};

export function InvoiceList({ initialInvoices }: InvoiceListProps) {
  const [filter, setFilter] = useState<'all' | InvoiceType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | InvoiceStatus>('all');

  const filteredInvoices = initialInvoices.filter((invoice) => {
    if (filter !== 'all' && invoice.invoiceType !== filter) return false;
    if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;
    return true;
  });

  const formatCurrency = (amount: number | null, currency: string) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 p-6 border-b">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('INCOMING')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === 'INCOMING'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            Incoming
          </button>
          <button
            onClick={() => setFilter('OUTGOING')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === 'OUTGOING'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            Outgoing
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | InvoiceStatus)}
          className="px-3 py-1.5 rounded-md text-sm border bg-white dark:bg-gray-900 dark:border-gray-700"
        >
          <option value="all">All Statuses</option>
          <option value="UPLOADED">Uploaded</option>
          <option value="PROCESSING">Processing</option>
          <option value="PROCESSED">Processed</option>
          <option value="APPROVED">Approved</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="COMPLETED">Completed</option>
          <option value="ERROR">Error</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                File Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Invoice #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Confidence
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                  No invoices found. Upload your first invoice to get started!
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                >
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    >
                      {invoice.fileName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {invoice.invoiceNumber || '—'}
                  </td>
                  <td className="px-6 py-4">
                    {invoice.company ? (
                      <div>
                        <div className="text-sm font-medium">{invoice.company.name}</div>
                        <div className="text-xs text-gray-500">NIP: {invoice.company.nip}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">{formatDate(invoice.invoiceDate)}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {formatCurrency(invoice.grossAmount, invoice.currency)}
                  </td>
                  <td className="px-6 py-4">
                    {invoice.invoiceType ? (
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          invoice.invoiceType === 'INCOMING'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        }`}
                      >
                        {invoice.invoiceType === 'INCOMING' ? '↓ In' : '↑ Out'}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        STATUS_COLORS[invoice.status as InvoiceStatus]
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {invoice.ocrConfidence !== null ? (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 w-16 rounded-full bg-gray-200 dark:bg-gray-700">
                          <div
                            className={`h-full rounded-full ${
                              invoice.ocrConfidence >= 0.9
                                ? 'bg-green-600'
                                : invoice.ocrConfidence >= 0.75
                                  ? 'bg-yellow-600'
                                  : 'bg-red-600'
                            }`}
                            style={{ width: `${invoice.ocrConfidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          {Math.round(invoice.ocrConfidence * 100)}%
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {initialInvoices.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <svg
            className="h-16 w-16 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Upload your first invoice to get started with AI-powered processing
          </p>
        </div>
      )}
    </div>
  );
}
