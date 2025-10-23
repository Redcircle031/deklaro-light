/**
 * Confidence Indicator Component
 *
 * Color-coded badge showing OCR confidence level
 * - Green (>= 90%): High confidence
 * - Yellow (70-89%): Medium confidence
 * - Red (< 70%): Low confidence
 *
 * WCAG 2.1 AA compliant with triple encoding: Color + Icon + Text
 */

import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { ConfidenceIndicatorProps, ConfidenceLevel } from './types';

/**
 * Get confidence level from score
 */
function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 90) return 'HIGH';
  if (confidence >= 70) return 'MEDIUM';
  return 'LOW';
}

/**
 * Get confidence level label
 */
function getConfidenceLabelText(level: ConfidenceLevel): string {
  const labels = {
    HIGH: 'High',
    MEDIUM: 'Medium',
    LOW: 'Low',
  };
  return labels[level];
}

/**
 * ConfidenceIndicator Component
 */
export const ConfidenceIndicator = React.memo(function ConfidenceIndicator({
  confidence,
  size = 'md',
  showLabel = false,
  className = '',
}: ConfidenceIndicatorProps) {
  // Round confidence to whole number
  const roundedConfidence = Math.round(confidence);

  // Determine confidence level
  const level = getConfidenceLevel(roundedConfidence);
  const labelText = getConfidenceLabelText(level);

  // Get color classes based on level
  const colorClasses = {
    HIGH: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-red-100 text-red-800',
  };

  // Get icon based on level
  const Icon = {
    HIGH: CheckCircle,
    MEDIUM: AlertTriangle,
    LOW: XCircle,
  }[level];

  // Get size classes
  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Get icon size
  const iconSize = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <div
      role="status"
      aria-label={`Confidence: ${roundedConfidence}% - ${labelText}`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${colorClasses[level]} ${sizeClasses[size]} ${className}`}
    >
      {/* Icon (decorative, color-blind accessible) */}
      <Icon className={iconSize[size]} aria-hidden="true" />

      {/* Percentage (always visible) */}
      <span>{roundedConfidence}%</span>

      {/* Label text (optional) */}
      {showLabel && <span className="ml-0.5">{labelText}</span>}
    </div>
  );
});
