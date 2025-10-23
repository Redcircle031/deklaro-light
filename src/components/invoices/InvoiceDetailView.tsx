'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { KSeFSubmitButton } from './KSeFSubmitButton';
import { OCRProcessingStatus } from './OCRProcessingStatus';
import { ReviewExtractedData } from './ReviewExtractedData';
import { processInvoiceOCR, approveInvoice } from '@/lib/api/ocr-client';
import type { OCRJobResult, ExtractedData, ConfidenceScores } from './types';

interface InvoiceDetailViewProps {
  invoice: {
    id: string;
    fileName: string;
    originalFileUrl: string;
    status: string;
    invoiceType: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    dueDate?: string;
    currency: string;
    netAmount?: number;
    vatAmount?: number;
    grossAmount?: number;
    ocrConfidence?: number;
    ksefNumber?: string;
    company?: {
      name: string;
      nip: string;
      address?: string;
      city?: string;
      postalCode?: string;
    };
    lineItems?: Array<{
      id: string;
      lineNumber: number;
      description: string;
      quantity: number;
      unitPrice: number;
      vatRate: number;
      netAmount: number;
      vatAmount: number;
      grossAmount: number;
    }>;
    extractedData?: {
      supplier: {
        name?: string;
        vatId?: string;
        address?: string;
      };
      buyer: {
        name?: string;
        vatId?: string;
        address?: string;
      };
    };
    ocrJob?: {
      status: string;
      progress: number;
      rawText?: string | null;
      confidence?: number | null;
    };
  };
}

export function InvoiceDetailView({ invoice }: InvoiceDetailViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'extraction' | 'raw' | 'audit'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({
    invoiceNumber: invoice.invoiceNumber || '',
    invoiceDate: invoice.invoiceDate?.split('T')[0] || '',
    dueDate: invoice.dueDate?.split('T')[0] || '',
    netAmount: invoice.netAmount || 0,
    vatAmount: invoice.vatAmount || 0,
    grossAmount: invoice.grossAmount || 0,
  });

  // OCR workflow state
  const [ocrJobId, setOcrJobId] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRJobResult | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [tenantId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('x-tenant-id') || '';
    }
    return '';
  });

  // Handle OCR processing
  const handleProcessOCR = async () => {
    setIsProcessingOCR(true);
    try {
      const response = await processInvoiceOCR(invoice.id);
      setOcrJobId(response.job_id);
    } catch (error) {
      console.error('[InvoiceDetailView] Failed to start OCR:', error);
      alert('Failed to start OCR processing. Please try again.');
      setIsProcessingOCR(false);
    }
  };

  // Handle OCR completion
  const handleOCRComplete = (result: OCRJobResult) => {
    setOcrResult(result);
    setIsProcessingOCR(false);
    // Switch to extraction tab to show results
    setActiveTab('extraction');
  };

  // Handle OCR error
  const handleOCRError = (error: string) => {
    console.error('[InvoiceDetailView] OCR error:', error);
    setIsProcessingOCR(false);
  };

  // Handle approve invoice
  const handleApprove = async () => {
    if (!window.confirm('Are you sure you want to approve this invoice? This action cannot be undone.')) {
      return;
    }

    setIsApproving(true);
    try {
      await approveInvoice(invoice.id);
      alert('Invoice approved successfully!');
      // Reload page to update invoice status
      window.location.reload();
    } catch (error) {
      console.error('[InvoiceDetailView] Failed to approve:', error);
      alert('Failed to approve invoice. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return '—';
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: invoice.currency,
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('pl-PL');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Preview */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 rounded-lg border bg-card p-4">
          <h3 className="font-semibold mb-4">Document Preview</h3>
          <div className="aspect-[1/1.4] bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
            <svg
              className="h-16 w-16 text-gray-400"
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
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            PDF preview coming soon
          </p>

          {/* OCR Confidence */}
          {invoice.ocrConfidence !== undefined && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-sm font-medium mb-2">OCR Confidence</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
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
                <span className="text-sm font-semibold">
                  {Math.round(invoice.ocrConfidence * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Details */}
      <div className="lg:col-span-2 space-y-6">
        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('extraction')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'extraction'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              Extracted Data
            </button>
            <button
              onClick={() => setActiveTab('raw')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'raw'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              Raw OCR
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'audit'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              Audit Trail
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* OCR Processing Button */}
            {invoice.status === 'UPLOADED' && !ocrJobId && !ocrResult && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">AI-Powered Data Extraction</h3>
                    <p className="text-sm text-blue-700">
                      Extract invoice data automatically using OCR and AI
                    </p>
                  </div>
                  <button
                    onClick={handleProcessOCR}
                    disabled={isProcessingOCR}
                    className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isProcessingOCR ? 'Starting...' : 'Process with OCR'}
                  </button>
                </div>
              </div>
            )}

            {/* OCR Processing Status */}
            {ocrJobId && !ocrResult && (
              <OCRProcessingStatus
                jobId={ocrJobId}
                tenantId={tenantId}
                onComplete={handleOCRComplete}
                onError={handleOCRError}
              />
            )}

            {/* Invoice Info */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">Invoice Information</h3>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Invoice Number</dt>
                  <dd className="font-medium">{invoice.invoiceNumber || '—'}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Type</dt>
                  <dd>
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        invoice.invoiceType === 'INCOMING'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      }`}
                    >
                      {invoice.invoiceType}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Invoice Date</dt>
                  <dd className="font-medium">{formatDate(invoice.invoiceDate)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Due Date</dt>
                  <dd className="font-medium">{formatDate(invoice.dueDate)}</dd>
                </div>
              </dl>
            </div>

            {/* Company Info */}
            {invoice.company && (
              <div className="rounded-lg border bg-card p-6">
                <h3 className="font-semibold mb-4">Company Details</h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Company Name</dt>
                    <dd className="font-medium">{invoice.company.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">NIP</dt>
                    <dd className="font-medium font-mono">{invoice.company.nip}</dd>
                  </div>
                  {invoice.company.address && (
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">Address</dt>
                      <dd className="font-medium">
                        {invoice.company.address}
                        {invoice.company.city && `, ${invoice.company.postalCode} ${invoice.company.city}`}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Amounts */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">Financial Summary</h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">Net Amount</dt>
                  <dd className="font-medium">{formatCurrency(invoice.netAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600 dark:text-gray-400">VAT Amount</dt>
                  <dd className="font-medium">{formatCurrency(invoice.vatAmount)}</dd>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <dt className="font-semibold">Gross Amount</dt>
                  <dd className="text-lg font-bold">{formatCurrency(invoice.grossAmount)}</dd>
                </div>
              </dl>
            </div>

            {/* KSeF Submission */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">KSeF Submission</h3>
              <KSeFSubmitButton
                invoiceId={invoice.id}
                invoiceNumber={invoice.invoiceNumber}
                currentStatus={invoice.status}
                ksefNumber={invoice.ksefNumber}
              />
            </div>

            {/* Line Items */}
            {invoice.lineItems && invoice.lineItems.length > 0 && (
              <div className="rounded-lg border bg-card p-6">
                <h3 className="font-semibold mb-4">Line Items</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2">Qty</th>
                        <th className="text-right py-2">Unit Price</th>
                        <th className="text-right py-2">VAT %</th>
                        <th className="text-right py-2">Net</th>
                        <th className="text-right py-2">Gross</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invoice.lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3">{item.description}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="text-right">{item.vatRate}%</td>
                          <td className="text-right font-medium">{formatCurrency(item.netAmount)}</td>
                          <td className="text-right font-medium">{formatCurrency(item.grossAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Extraction Tab */}
        {activeTab === 'extraction' && (
          <div className="space-y-6">
            {/* New OCR Review Component */}
            {ocrResult && (
              <>
                <ReviewExtractedData
                  invoiceId={invoice.id}
                  tenantId={tenantId}
                  extractedData={ocrResult.extracted_data}
                  confidenceScores={ocrResult.confidence_scores}
                  rawOcrText={ocrResult.raw_ocr_text}
                  isApproved={invoice.status === 'VERIFIED'}
                />

                {/* Approve Button */}
                {invoice.status !== 'VERIFIED' && (
                  <div className="rounded-lg border bg-card p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold mb-1">Approve Invoice</h3>
                        <p className="text-sm text-gray-600">
                          Review the data above and approve to lock this invoice
                        </p>
                      </div>
                      <button
                        onClick={handleApprove}
                        disabled={isApproving}
                        className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isApproving ? 'Approving...' : 'Approve Invoice'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Fallback to old extraction view if no OCR result */}
            {!ocrResult && invoice.extractedData && (
              <>
                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-semibold mb-4">Supplier (From)</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">Name</dt>
                      <dd className="font-medium">{invoice.extractedData.supplier.name || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">VAT ID</dt>
                      <dd className="font-medium font-mono">{invoice.extractedData.supplier.vatId || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">Address</dt>
                      <dd className="font-medium">{invoice.extractedData.supplier.address || '—'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-lg border bg-card p-6">
                  <h3 className="font-semibold mb-4">Buyer (To)</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">Name</dt>
                      <dd className="font-medium">{invoice.extractedData.buyer.name || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">VAT ID</dt>
                      <dd className="font-medium font-mono">{invoice.extractedData.buyer.vatId || '—'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">Address</dt>
                      <dd className="font-medium">{invoice.extractedData.buyer.address || '—'}</dd>
                    </div>
                  </dl>
                </div>
              </>
            )}
          </div>
        )}

        {/* Raw OCR Tab */}
        {activeTab === 'raw' && (
          <div className="space-y-6">
            {/* OCR Job Status */}
            {invoice.ocrJob && (
              <div className="rounded-lg border bg-card p-6">
                <h3 className="font-semibold mb-4">OCR Processing Status</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Status</dt>
                    <dd>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          invoice.ocrJob.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : invoice.ocrJob.status === 'FAILED'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                        }`}
                      >
                        {invoice.ocrJob.status}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Progress</dt>
                    <dd className="font-medium">{invoice.ocrJob.progress}%</dd>
                  </div>
                  {invoice.ocrJob.confidence !== null && invoice.ocrJob.confidence !== undefined && (
                    <div>
                      <dt className="text-sm text-gray-600 dark:text-gray-400">OCR Confidence</dt>
                      <dd className="font-medium">{Math.round(invoice.ocrJob.confidence * 100)}%</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Raw OCR Text */}
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">Raw OCR Text</h3>
              {invoice.ocrJob?.rawText ? (
                <pre className="text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono">
                  {invoice.ocrJob.rawText}
                </pre>
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  {invoice.status === 'UPLOADED' || invoice.status === 'PROCESSING'
                    ? 'OCR processing in progress...'
                    : 'No OCR text available'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Audit Trail Tab */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-6">
              <h3 className="font-semibold mb-4">Activity History</h3>
              <div className="space-y-4">
                {/* Demo audit trail - replace with real data when available */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-2 bg-blue-600 rounded"></div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">Invoice Created</span>
                      <span className="text-xs text-gray-500">{formatDate(invoice.invoiceDate)}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Invoice uploaded to the system
                    </p>
                    <p className="text-xs text-gray-500 mt-1">System</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-2 bg-green-600 rounded"></div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">OCR Processing Completed</span>
                      <span className="text-xs text-gray-500">{formatDate(invoice.invoiceDate)}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      OCR processing completed with {invoice.ocrConfidence ? Math.round(invoice.ocrConfidence * 100) : 0}% confidence
                    </p>
                    <p className="text-xs text-gray-500 mt-1">OCR Engine</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-2 bg-purple-600 rounded"></div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">Status Changed</span>
                      <span className="text-xs text-gray-500">{formatDate(invoice.invoiceDate)}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Status changed to {invoice.status}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Demo User</p>
                  </div>
                </div>

                {invoice.ksefNumber && (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-2 bg-indigo-600 rounded"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">Submitted to KSeF</span>
                        <span className="text-xs text-gray-500">{formatDate(invoice.invoiceDate)}</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Successfully submitted with reference: {invoice.ksefNumber}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">KSeF Integration</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
