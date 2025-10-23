'use client';

import { useState } from 'react';

interface KSeFSubmitButtonProps {
  invoiceId: string;
  invoiceNumber?: string;
  currentStatus?: string;
  ksefNumber?: string;
}

export function KSeFSubmitButton({
  invoiceId,
  invoiceNumber,
  currentStatus,
  ksefNumber,
}: KSeFSubmitButtonProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if invoice can be submitted
  const canSubmit =
    (currentStatus === 'PROCESSED' || currentStatus === 'APPROVED') && !ksefNumber;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/ksef/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invoiceId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(`Invoice submitted successfully! KSeF Number: ${data.ksefNumber}`);
        setShowConfirm(false);
        // Refresh page to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setError(data.error || 'Submission failed. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (ksefNumber) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 p-4">
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <div>
            <p className="font-medium text-green-900 dark:text-green-100">
              Submitted to KSeF
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              KSeF Number: <span className="font-mono">{ksefNumber}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!canSubmit) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 dark:bg-gray-900 p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Invoice must be processed and approved before KSeF submission
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          Submit to KSeF
        </button>
      ) : (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 p-4 space-y-4">
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
              Confirm KSeF Submission
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              You are about to submit invoice{' '}
              <span className="font-mono">{invoiceNumber || invoiceId}</span> to the
              Polish National e-Invoice System (KSeF). This action cannot be undone.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Submit'}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setError(null);
              }}
              disabled={isSubmitting}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-900 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950 p-4">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-red-600 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p className="font-medium text-red-900 dark:text-red-100">
                Submission Failed
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950 p-4">
          <div className="flex items-start gap-2">
            <svg
              className="h-5 w-5 text-green-600 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <div>
              <p className="font-medium text-green-900 dark:text-green-100">Success!</p>
              <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
