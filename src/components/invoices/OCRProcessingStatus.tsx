/**
 * OCR Processing Status Component
 *
 * Displays real-time OCR job status with polling
 * - QUEUED: Shows queue position
 * - PROCESSING: Shows progress bar with current step
 * - COMPLETED: Calls onComplete callback
 * - FAILED: Shows error message with retry button
 *
 * Polls GET /api/ocr/status/[id] every 2 seconds while PROCESSING
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { fetchOCRStatus, retryOCRJob, type OCRStatusResponse } from '@/lib/api/ocr-client';
import type { OCRProcessingStatusProps } from './types';

/**
 * Step labels for display
 */
const STEP_LABELS = {
  UPLOAD: 'Uploading...',
  PREPROCESS: 'Enhancing image...',
  OCR: 'Extracting text...',
  AI_EXTRACT: 'Analyzing invoice...',
  VALIDATE: 'Validating data...',
  SAVE: 'Saving results...',
} as const;

/**
 * Estimated progress for each step
 */
const STEP_PROGRESS = {
  UPLOAD: 10,
  PREPROCESS: 20,
  OCR: 50,
  AI_EXTRACT: 80,
  VALIDATE: 90,
  SAVE: 95,
} as const;

/**
 * OCRProcessingStatus Component
 */
export function OCRProcessingStatus({
  jobId,
  tenantId,
  onComplete,
  onError,
  pollingInterval = 2000,
}: OCRProcessingStatusProps) {
  const [status, setStatus] = useState<OCRStatusResponse | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Fetch status function
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetchOCRStatus(jobId);
      setStatus(response);
      setError(null);

      // Stop polling when job is complete or failed
      if (response.status === 'COMPLETED' || response.status === 'FAILED') {
        setIsPolling(false);

        if (response.status === 'COMPLETED' && onComplete && response.result) {
          onComplete({
            extracted_data: response.result.extracted_data,
            confidence_scores: response.result.confidence_scores,
            ocr_confidence_overall: response.result.ocr_confidence_overall,
            requires_review: response.result.requires_review,
            raw_ocr_text: response.result.raw_ocr_text,
          });
        }

        if (response.status === 'FAILED' && onError && !response.will_retry) {
          onError(response.error?.message || 'OCR processing failed');
        }
      }
    } catch (err) {
      console.error('[OCRProcessingStatus] Failed to fetch status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  }, [jobId, onComplete, onError]);

  // Polling effect
  useEffect(() => {
    if (!isPolling) return;

    // Initial fetch
    fetchStatus();

    // Set up polling interval
    const intervalId = setInterval(() => {
      // Only poll if tab is visible
      if (document.visibilityState === 'visible') {
        fetchStatus();
      }
    }, pollingInterval);

    // Cleanup on unmount or when polling stops
    return () => {
      clearInterval(intervalId);
    };
  }, [isPolling, pollingInterval, fetchStatus]);

  // Handle retry
  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const newJob = await retryOCRJob(jobId);
      // Reset state and start polling again
      setStatus({
        ...newJob,
        status: 'QUEUED',
      });
      setIsPolling(true);
      setError(null);
    } catch (err) {
      console.error('[OCRProcessingStatus] Failed to retry:', err);
      setError(err instanceof Error ? err.message : 'Failed to retry');
    } finally {
      setIsRetrying(false);
    }
  };

  // Loading state (initial fetch)
  if (!status && !error) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <p className="text-sm text-gray-600">Loading OCR status...</p>
        </div>
      </div>
    );
  }

  // Error state (network error)
  if (error && !status) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <XCircle className="h-5 w-5 text-red-600" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Connection Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={fetchStatus}
            className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-900 hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  // QUEUED state
  if (status.status === 'QUEUED') {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <h3 className="font-semibold">Invoice Queued for Processing</h3>
              <p className="text-sm text-gray-600">
                {status.queue_position !== undefined
                  ? `Position in queue: ${status.queue_position}`
                  : 'Waiting to start...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // PROCESSING state
  if (status.status === 'PROCESSING') {
    const progress = status.progress || (status.current_step ? STEP_PROGRESS[status.current_step] : 0);
    const currentStepLabel = status.current_step ? STEP_LABELS[status.current_step] : 'Processing...';

    // Calculate estimated time remaining
    const estimatedSeconds = status.estimated_completion
      ? Math.max(0, Math.round((new Date(status.estimated_completion).getTime() - Date.now()) / 1000))
      : null;

    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <h3 className="font-semibold">Processing Invoice</h3>
            </div>
            <span className="text-sm font-medium text-gray-600">{progress}%</span>
          </div>

          {/* Progress bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Current step */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{currentStepLabel}</span>
            {estimatedSeconds !== null && (
              <span className="text-gray-500">
                {estimatedSeconds > 0 ? `~${estimatedSeconds}s remaining` : 'Almost done...'}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // COMPLETED state
  if (status.status === 'COMPLETED') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <div>
            <h3 className="font-semibold text-green-900">Processing Complete</h3>
            <p className="text-sm text-green-700">
              Invoice data extracted successfully
              {status.duration_ms && ` in ${(status.duration_ms / 1000).toFixed(1)}s`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // FAILED state
  if (status.status === 'FAILED') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">Processing Failed</h3>
              <p className="text-sm text-red-700 mt-1">
                {status.error?.message || 'An unknown error occurred'}
              </p>
              {status.error?.step && (
                <p className="text-xs text-red-600 mt-1">Failed at step: {status.error.step}</p>
              )}
            </div>
          </div>

          {/* Retry info or button */}
          {status.will_retry ? (
            <div className="text-xs text-red-600 bg-red-100 rounded px-3 py-2">
              Retrying automatically... (Attempt {(status.retry_count || 0) + 1})
            </div>
          ) : (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-2 rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Retrying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Retry Processing
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
