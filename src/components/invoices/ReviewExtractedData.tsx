/**
 * Review Extracted Data Component
 *
 * Editable form for reviewing and correcting OCR-extracted invoice data
 * Features:
 * - Confidence indicators next to each field
 * - Field validation (NIP, dates, amounts)
 * - Correction tracking
 * - Side-by-side raw OCR text viewer
 * - Read-only mode for approved invoices
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Save, Edit2, CheckCircle, AlertCircle } from 'lucide-react';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { submitCorrections, type Correction } from '@/lib/api/ocr-client';
import type { ReviewExtractedDataProps, ExtractedData, ValidationState } from './types';

/**
 * Validate NIP (10 digits)
 */
function validateNIP(nip: string): string | null {
  if (!nip) return 'NIP is required';
  if (!/^\d{10}$/.test(nip)) return 'NIP must be 10 digits';
  return null;
}

/**
 * Validate date (YYYY-MM-DD)
 */
function validateDate(date: string, fieldName: string, required = true): string | null {
  if (!date && required) return `${fieldName} is required`;
  if (!date) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Date must be in YYYY-MM-DD format';
  return null;
}

/**
 * Validate amount (numeric, non-negative)
 */
function validateAmount(amount: number | string, fieldName: string): string | null {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return `${fieldName} must be a number`;
  if (num < 0) return `${fieldName} cannot be negative`;
  return null;
}

/**
 * ReviewExtractedData Component
 */
export function ReviewExtractedData({
  invoiceId,
  tenantId,
  extractedData,
  confidenceScores,
  rawOcrText,
  isApproved = false,
  onSave,
  showRawText = true,
}: ReviewExtractedDataProps) {
  const [formData, setFormData] = useState<ExtractedData>(extractedData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showRawOCR, setShowRawOCR] = useState(showRawText);

  // Track which fields were manually corrected
  const [correctedFields, setCorrectedFields] = useState<Set<string>>(new Set());

  // Calculate corrections
  const corrections = useMemo<Correction[]>(() => {
    const changes: Correction[] = [];

    // Helper to add correction
    const addCorrection = (fieldName: string, original: unknown, corrected: unknown) => {
      if (original !== corrected) {
        changes.push({
          field_name: fieldName,
          original_value: String(original ?? ''),
          corrected_value: String(corrected ?? ''),
        });
      }
    };

    // Invoice fields
    addCorrection('invoice_number', extractedData.invoice_number, formData.invoice_number);
    addCorrection('issue_date', extractedData.issue_date, formData.issue_date);
    addCorrection('due_date', extractedData.due_date, formData.due_date);
    addCorrection('currency', extractedData.currency, formData.currency);

    // Amounts
    addCorrection('net_amount', extractedData.net_amount, formData.net_amount);
    addCorrection('vat_amount', extractedData.vat_amount, formData.vat_amount);
    addCorrection('gross_amount', extractedData.gross_amount, formData.gross_amount);

    // Seller
    addCorrection('seller.name', extractedData.seller.name, formData.seller.name);
    addCorrection('seller.nip', extractedData.seller.nip, formData.seller.nip);
    addCorrection('seller.address', extractedData.seller.address, formData.seller.address);

    // Buyer
    addCorrection('buyer.name', extractedData.buyer.name, formData.buyer.name);
    addCorrection('buyer.nip', extractedData.buyer.nip, formData.buyer.nip);
    addCorrection('buyer.address', extractedData.buyer.address, formData.buyer.address);

    return changes;
  }, [extractedData, formData]);

  // Validation state
  const validation = useMemo<ValidationState>(() => {
    const errors: Record<string, string> = {};

    // Validate invoice fields
    const invoiceNumberError = !formData.invoice_number ? 'Invoice number is required' : null;
    if (invoiceNumberError) errors.invoice_number = invoiceNumberError;

    const issueDateError = validateDate(formData.issue_date, 'Issue date');
    if (issueDateError) errors.issue_date = issueDateError;

    const dueDateError = validateDate(formData.due_date || '', 'Due date', false);
    if (dueDateError) errors.due_date = dueDateError;

    // Validate seller
    const sellerNipError = validateNIP(formData.seller.nip);
    if (sellerNipError) errors['seller.nip'] = sellerNipError;

    const sellerNameError = !formData.seller.name ? 'Seller name is required' : null;
    if (sellerNameError) errors['seller.name'] = sellerNameError;

    // Validate buyer
    const buyerNipError = validateNIP(formData.buyer.nip);
    if (buyerNipError) errors['buyer.nip'] = buyerNipError;

    const buyerNameError = !formData.buyer.name ? 'Buyer name is required' : null;
    if (buyerNameError) errors['buyer.name'] = buyerNameError;

    // Validate amounts
    const netError = validateAmount(formData.net_amount, 'Net amount');
    if (netError) errors.net_amount = netError;

    const vatError = validateAmount(formData.vat_amount, 'VAT amount');
    if (vatError) errors.vat_amount = vatError;

    const grossError = validateAmount(formData.gross_amount, 'Gross amount');
    if (grossError) errors.gross_amount = grossError;

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }, [formData]);

  // Handle field change
  const handleFieldChange = (fieldPath: string, value: string | number) => {
    // Mark field as corrected
    setCorrectedFields((prev) => new Set(prev).add(fieldPath));

    // Update form data
    const keys = fieldPath.split('.');
    if (keys.length === 1) {
      setFormData((prev) => ({ ...prev, [keys[0]]: value }));
    } else if (keys.length === 2) {
      setFormData((prev) => ({
        ...prev,
        [keys[0]]: {
          ...(prev[keys[0] as keyof ExtractedData] as Record<string, unknown>),
          [keys[1]]: value,
        },
      }));
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!validation.isValid) {
      setSaveError('Please fix validation errors before saving');
      return;
    }

    if (corrections.length === 0) {
      setSaveError('No changes to save');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await submitCorrections(invoiceId, corrections);
      setSaveSuccess(true);
      setCorrectedFields(new Set()); // Clear corrected fields
      if (onSave) {
        onSave(corrections);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('[ReviewExtractedData] Save failed:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save corrections');
    } finally {
      setIsSaving(false);
    }
  };

  // Get field confidence score
  const getFieldConfidence = (fieldName: string): number => {
    const scoreMap: Record<string, number> = {
      invoice_number: confidenceScores.invoice_number,
      issue_date: confidenceScores.issue_date,
      due_date: confidenceScores.due_date,
      'seller.name': confidenceScores.seller_name,
      'seller.nip': confidenceScores.seller_nip,
      'seller.address': confidenceScores.seller_address,
      'buyer.name': confidenceScores.buyer_name,
      'buyer.nip': confidenceScores.buyer_nip,
      'buyer.address': confidenceScores.buyer_address,
      net_amount: confidenceScores.net_amount,
      vat_amount: confidenceScores.vat_amount,
      gross_amount: confidenceScores.gross_amount,
      currency: confidenceScores.currency,
    };
    return scoreMap[fieldName] || 0;
  };

  // Check if field has low confidence
  const isLowConfidence = (fieldName: string): boolean => {
    return getFieldConfidence(fieldName) < 70;
  };

  return (
    <div className="space-y-6">
      {/* Success/Error messages */}
      {saveSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-5 w-5" />
            <p className="font-medium">Corrections saved successfully</p>
          </div>
        </div>
      )}

      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-5 w-5" />
            <p className="font-medium">{saveError}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Editable Form */}
        <div className="space-y-6">
          {/* Invoice Information */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              Invoice Information
              {isApproved && <span className="text-xs text-gray-500">(Read-only)</span>}
            </h3>

            <div className="space-y-4">
              {/* Invoice Number */}
              <div>
                <label htmlFor="invoice_number" className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                  {correctedFields.has('invoice_number') && (
                    <Edit2 className="inline h-3 w-3 ml-1 text-blue-600" />
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="invoice_number"
                    type="text"
                    value={formData.invoice_number}
                    onChange={(e) => handleFieldChange('invoice_number', e.target.value)}
                    disabled={isApproved}
                    required
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      isLowConfidence('invoice_number')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    } ${isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    aria-invalid={!!validation.errors.invoice_number}
                    aria-describedby={validation.errors.invoice_number ? 'invoice_number-error' : undefined}
                  />
                  <ConfidenceIndicator confidence={getFieldConfidence('invoice_number')} size="sm" />
                </div>
                {validation.errors.invoice_number && (
                  <p id="invoice_number-error" className="text-sm text-red-600 mt-1">
                    {validation.errors.invoice_number}
                  </p>
                )}
              </div>

              {/* Issue Date */}
              <div>
                <label htmlFor="issue_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Date
                  {correctedFields.has('issue_date') && (
                    <Edit2 className="inline h-3 w-3 ml-1 text-blue-600" />
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="issue_date"
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => handleFieldChange('issue_date', e.target.value)}
                    disabled={isApproved}
                    required
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      isLowConfidence('issue_date')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    } ${isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    aria-invalid={!!validation.errors.issue_date}
                  />
                  <ConfidenceIndicator confidence={getFieldConfidence('issue_date')} size="sm" />
                </div>
                {validation.errors.issue_date && (
                  <p className="text-sm text-red-600 mt-1">{validation.errors.issue_date}</p>
                )}
              </div>

              {/* Due Date */}
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date (optional)
                  {correctedFields.has('due_date') && (
                    <Edit2 className="inline h-3 w-3 ml-1 text-blue-600" />
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="due_date"
                    type="date"
                    value={formData.due_date || ''}
                    onChange={(e) => handleFieldChange('due_date', e.target.value)}
                    disabled={isApproved}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      isLowConfidence('due_date')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    } ${isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <ConfidenceIndicator confidence={getFieldConfidence('due_date')} size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Seller Information */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-4">Seller (From)</h3>

            <div className="space-y-4">
              {/* Seller Name */}
              <div>
                <label htmlFor="seller_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                  {correctedFields.has('seller.name') && (
                    <Edit2 className="inline h-3 w-3 ml-1 text-blue-600" />
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="seller_name"
                    type="text"
                    value={formData.seller.name}
                    onChange={(e) => handleFieldChange('seller.name', e.target.value)}
                    disabled={isApproved}
                    required
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      isLowConfidence('seller.name')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    } ${isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <ConfidenceIndicator confidence={getFieldConfidence('seller.name')} size="sm" />
                </div>
                {validation.errors['seller.name'] && (
                  <p className="text-sm text-red-600 mt-1">{validation.errors['seller.name']}</p>
                )}
              </div>

              {/* Seller NIP */}
              <div>
                <label htmlFor="seller_nip" className="block text-sm font-medium text-gray-700 mb-1">
                  NIP
                  {correctedFields.has('seller.nip') && (
                    <Edit2 className="inline h-3 w-3 ml-1 text-blue-600" />
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="seller_nip"
                    type="text"
                    value={formData.seller.nip}
                    onChange={(e) => handleFieldChange('seller.nip', e.target.value)}
                    disabled={isApproved}
                    required
                    pattern="\d{10}"
                    maxLength={10}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-mono ${
                      isLowConfidence('seller.nip')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    } ${isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <ConfidenceIndicator confidence={getFieldConfidence('seller.nip')} size="sm" />
                </div>
                {validation.errors['seller.nip'] && (
                  <p className="text-sm text-red-600 mt-1">{validation.errors['seller.nip']}</p>
                )}
              </div>

              {/* Seller Address */}
              <div>
                <label htmlFor="seller_address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                  {correctedFields.has('seller.address') && (
                    <Edit2 className="inline h-3 w-3 ml-1 text-blue-600" />
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="seller_address"
                    type="text"
                    value={formData.seller.address || ''}
                    onChange={(e) => handleFieldChange('seller.address', e.target.value)}
                    disabled={isApproved}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      isLowConfidence('seller.address')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    } ${isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <ConfidenceIndicator confidence={getFieldConfidence('seller.address')} size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Buyer Information */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-4">Buyer (To)</h3>

            <div className="space-y-4">
              {/* Buyer Name */}
              <div>
                <label htmlFor="buyer_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                  {correctedFields.has('buyer.name') && (
                    <Edit2 className="inline h-3 w-3 ml-1 text-blue-600" />
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="buyer_name"
                    type="text"
                    value={formData.buyer.name}
                    onChange={(e) => handleFieldChange('buyer.name', e.target.value)}
                    disabled={isApproved}
                    required
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      isLowConfidence('buyer.name')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    } ${isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <ConfidenceIndicator confidence={getFieldConfidence('buyer.name')} size="sm" />
                </div>
                {validation.errors['buyer.name'] && (
                  <p className="text-sm text-red-600 mt-1">{validation.errors['buyer.name']}</p>
                )}
              </div>

              {/* Buyer NIP */}
              <div>
                <label htmlFor="buyer_nip" className="block text-sm font-medium text-gray-700 mb-1">
                  NIP
                  {correctedFields.has('buyer.nip') && (
                    <Edit2 className="inline h-3 w-3 ml-1 text-blue-600" />
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="buyer_nip"
                    type="text"
                    value={formData.buyer.nip}
                    onChange={(e) => handleFieldChange('buyer.nip', e.target.value)}
                    disabled={isApproved}
                    required
                    pattern="\d{10}"
                    maxLength={10}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-mono ${
                      isLowConfidence('buyer.nip')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    } ${isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <ConfidenceIndicator confidence={getFieldConfidence('buyer.nip')} size="sm" />
                </div>
                {validation.errors['buyer.nip'] && (
                  <p className="text-sm text-red-600 mt-1">{validation.errors['buyer.nip']}</p>
                )}
              </div>

              {/* Buyer Address */}
              <div>
                <label htmlFor="buyer_address" className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                  {correctedFields.has('buyer.address') && (
                    <Edit2 className="inline h-3 w-3 ml-1 text-blue-600" />
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="buyer_address"
                    type="text"
                    value={formData.buyer.address || ''}
                    onChange={(e) => handleFieldChange('buyer.address', e.target.value)}
                    disabled={isApproved}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      isLowConfidence('buyer.address')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    } ${isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <ConfidenceIndicator confidence={getFieldConfidence('buyer.address')} size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold mb-4">Financial Summary</h3>

            <div className="space-y-4">
              {/* Net Amount */}
              <div>
                <label htmlFor="net_amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Net Amount
                  {correctedFields.has('net_amount') && (
                    <Edit2 className="inline h-3 w-3 ml-1 text-blue-600" />
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="net_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.net_amount}
                    onChange={(e) => handleFieldChange('net_amount', parseFloat(e.target.value))}
                    disabled={isApproved}
                    required
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      isLowConfidence('net_amount')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    } ${isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <ConfidenceIndicator confidence={getFieldConfidence('net_amount')} size="sm" />
                </div>
                {validation.errors.net_amount && (
                  <p className="text-sm text-red-600 mt-1">{validation.errors.net_amount}</p>
                )}
              </div>

              {/* VAT Amount */}
              <div>
                <label htmlFor="vat_amount" className="block text-sm font-medium text-gray-700 mb-1">
                  VAT Amount
                  {correctedFields.has('vat_amount') && (
                    <Edit2 className="inline h-3 w-3 ml-1 text-blue-600" />
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="vat_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.vat_amount}
                    onChange={(e) => handleFieldChange('vat_amount', parseFloat(e.target.value))}
                    disabled={isApproved}
                    required
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      isLowConfidence('vat_amount')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    } ${isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <ConfidenceIndicator confidence={getFieldConfidence('vat_amount')} size="sm" />
                </div>
                {validation.errors.vat_amount && (
                  <p className="text-sm text-red-600 mt-1">{validation.errors.vat_amount}</p>
                )}
              </div>

              {/* Gross Amount */}
              <div>
                <label htmlFor="gross_amount" className="block text-sm font-medium text-gray-700 mb-1">
                  Gross Amount
                  {correctedFields.has('gross_amount') && (
                    <Edit2 className="inline h-3 w-3 ml-1 text-blue-600" />
                  )}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="gross_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.gross_amount}
                    onChange={(e) => handleFieldChange('gross_amount', parseFloat(e.target.value))}
                    disabled={isApproved}
                    required
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      isLowConfidence('gross_amount')
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-300'
                    } ${isApproved ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  <ConfidenceIndicator confidence={getFieldConfidence('gross_amount')} size="sm" />
                </div>
                {validation.errors.gross_amount && (
                  <p className="text-sm text-red-600 mt-1">{validation.errors.gross_amount}</p>
                )}
              </div>

              {/* Currency */}
              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                  Currency
                </label>
                <div className="flex items-center gap-2">
                  <select
                    id="currency"
                    value={formData.currency}
                    onChange={(e) => handleFieldChange('currency', e.target.value)}
                    disabled={isApproved}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                      isApproved ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'
                    }`}
                  >
                    <option value="PLN">PLN</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                  <ConfidenceIndicator confidence={getFieldConfidence('currency')} size="sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          {!isApproved && (
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={isSaving || corrections.length === 0 || !validation.isValid}
                className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Corrections ({corrections.length})
                  </>
                )}
              </button>

              {corrections.length === 0 && (
                <p className="text-sm text-gray-500">No changes to save</p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Raw OCR Text */}
        {showRawOCR && (
          <div className="hidden lg:block">
            <div className="sticky top-6 rounded-lg border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Raw OCR Text</h3>
                <button
                  onClick={() => setShowRawOCR(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Hide
                </button>
              </div>
              <div className="max-h-[800px] overflow-y-auto">
                <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono">
                  {rawOcrText}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
