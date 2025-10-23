'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Edit, Save, X, CheckCircle, XCircle, RefreshCw, FileText } from 'lucide-react';

interface Company {
  id: string;
  name: string;
  nip: string;
  regon?: string | null;
  krs?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
  vatRegistrationDate?: Date | null;
  invoices?: Array<{
    id: string;
    fileName: string;
    invoiceNumber?: string | null;
    createdAt: Date;
    grossAmount?: number | string | null;
    status: string;
  }>;
}

interface CompanyDetailViewProps {
  company: Company;
}

export function CompanyDetailView({ company: initialCompany }: CompanyDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [company, setCompany] = useState(initialCompany);
  const [validating, setValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<{
    isValid: boolean;
    message: string;
  } | null>(null);

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pl-PL');
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (!amount) return '—';
    const numAmount = typeof amount === 'number' ? amount : parseFloat(amount.toString());
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(numAmount);
  };

  const handleSave = async () => {
    // TODO: Implement API call to update company
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCompany(initialCompany);
    setIsEditing(false);
  };

  const handleValidateNIP = async () => {
    setValidating(true);
    setValidationStatus(null);

    try {
      const response = await fetch('/api/nip/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nip: company.nip }),
      });

      const result = await response.json();

      setValidationStatus({
        isValid: result.isValid,
        message: result.isValid
          ? `Company validated in VAT registry${result.cached ? ' (cached)' : ''}`
          : result.error || 'Validation failed',
      });
    } catch {
      setValidationStatus({
        isValid: false,
        message: 'Failed to validate NIP',
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/companies"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            ← Back to Companies
          </Link>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            {company.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 font-mono">NIP: {company.nip}</p>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Company Information */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Company Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Company Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={company.name}
                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-md border"
                  />
                ) : (
                  <div className="font-medium mt-1">{company.name}</div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">NIP</label>
                <div className="font-mono font-medium mt-1">{company.nip}</div>
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">REGON</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={company.regon || ''}
                    onChange={(e) => setCompany({ ...company, regon: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-md border"
                  />
                ) : (
                  <div className="font-medium mt-1">{company.regon || '—'}</div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">KRS</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={company.krs || ''}
                    onChange={(e) => setCompany({ ...company, krs: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-md border"
                  />
                ) : (
                  <div className="font-medium mt-1">{company.krs || '—'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Address</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Street</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={company.address || ''}
                    onChange={(e) => setCompany({ ...company, address: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-md border"
                  />
                ) : (
                  <div className="font-medium mt-1">{company.address || '—'}</div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">City</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={company.city || ''}
                    onChange={(e) => setCompany({ ...company, city: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-md border"
                  />
                ) : (
                  <div className="font-medium mt-1">{company.city || '—'}</div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Postal Code</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={company.postalCode || ''}
                    onChange={(e) => setCompany({ ...company, postalCode: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-md border"
                  />
                ) : (
                  <div className="font-medium mt-1">{company.postalCode || '—'}</div>
                )}
              </div>
              <div className="col-span-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Country</label>
                <div className="font-medium mt-1">{company.country || 'Poland'}</div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={company.email || ''}
                    onChange={(e) => setCompany({ ...company, email: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-md border"
                  />
                ) : (
                  <div className="font-medium mt-1">{company.email || '—'}</div>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Phone</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={company.phone || ''}
                    onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-md border"
                  />
                ) : (
                  <div className="font-medium mt-1">{company.phone || '—'}</div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Invoices */}
          {company.invoices && company.invoices.length > 0 ? (
            <div className="rounded-lg border bg-card p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Invoices</h3>
              <div className="space-y-3">
                {company.invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/dashboard/invoices/${invoice.id}`}
                    className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="font-medium">{invoice.invoiceNumber || invoice.fileName}</div>
                        <div className="text-sm text-gray-500">{formatDate(invoice.createdAt)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(invoice.grossAmount)}</div>
                      <div className="text-xs text-gray-500">{invoice.status}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* VAT Validation */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">VAT Registry Status</h3>
            <button
              onClick={handleValidateNIP}
              disabled={validating}
              className="w-full px-4 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${validating ? 'animate-spin' : ''}`} />
              {validating ? 'Validating...' : 'Validate NIP'}
            </button>

            {validationStatus ? (
              <div className={`mt-4 p-3 rounded-md flex items-start gap-2 ${
                validationStatus.isValid
                  ? 'bg-green-50 dark:bg-green-950/20 text-green-900 dark:text-green-100'
                  : 'bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-100'
              }`}>
                {validationStatus.isValid ? (
                  <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm">{validationStatus.message}</div>
              </div>
            ) : null}
          </div>

          {/* Metadata */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Metadata</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="text-gray-600 dark:text-gray-400">Created</div>
                <div className="font-medium">{formatDate(company.createdAt)}</div>
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400">Last Updated</div>
                <div className="font-medium">{formatDate(company.updatedAt)}</div>
              </div>
              {company.vatRegistrationDate ? (
                <div>
                  <div className="text-gray-600 dark:text-gray-400">VAT Registration</div>
                  <div className="font-medium">{formatDate(company.vatRegistrationDate)}</div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
