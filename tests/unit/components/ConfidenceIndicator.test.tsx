/**
 * Unit tests for ConfidenceIndicator component
 *
 * Tests color-coded confidence badge with accessibility
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceIndicator } from '@/components/invoices/ConfidenceIndicator';

describe('ConfidenceIndicator', () => {
  describe('Color coding based on confidence level', () => {
    it('renders green badge for high confidence (>= 90%)', () => {
      render(<ConfidenceIndicator confidence={95} />);

      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-800');
    });

    it('renders green badge for exactly 90%', () => {
      render(<ConfidenceIndicator confidence={90} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-800');
    });

    it('renders yellow badge for medium confidence (70-89%)', () => {
      render(<ConfidenceIndicator confidence={80} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-yellow-100');
      expect(badge).toHaveClass('text-yellow-800');
    });

    it('renders yellow badge for exactly 70%', () => {
      render(<ConfidenceIndicator confidence={70} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-yellow-100');
      expect(badge).toHaveClass('text-yellow-800');
    });

    it('renders red badge for low confidence (< 70%)', () => {
      render(<ConfidenceIndicator confidence={50} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
    });

    it('renders red badge for very low confidence', () => {
      render(<ConfidenceIndicator confidence={10} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-red-100');
      expect(badge).toHaveClass('text-red-800');
    });
  });

  describe('Icon display', () => {
    it('shows CheckCircle icon for high confidence', () => {
      render(<ConfidenceIndicator confidence={95} />);

      // Icon should be decorative (aria-hidden)
      const badge = screen.getByRole('status');
      const svg = badge.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('shows AlertTriangle icon for medium confidence', () => {
      render(<ConfidenceIndicator confidence={80} />);

      const badge = screen.getByRole('status');
      const svg = badge.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('shows XCircle icon for low confidence', () => {
      render(<ConfidenceIndicator confidence={50} />);

      const badge = screen.getByRole('status');
      const svg = badge.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Text content', () => {
    it('displays confidence percentage', () => {
      render(<ConfidenceIndicator confidence={95} />);

      expect(screen.getByText('95%')).toBeInTheDocument();
    });

    it('rounds confidence percentage to whole number', () => {
      render(<ConfidenceIndicator confidence={87.6} />);

      expect(screen.getByText('88%')).toBeInTheDocument();
    });

    it('shows label text when showLabel={true}', () => {
      render(<ConfidenceIndicator confidence={95} showLabel={true} />);

      expect(screen.getByText(/high/i)).toBeInTheDocument();
    });

    it('hides label text when showLabel={false}', () => {
      render(<ConfidenceIndicator confidence={95} showLabel={false} />);

      expect(screen.queryByText(/high/i)).not.toBeInTheDocument();
    });

    it('hides label text by default', () => {
      render(<ConfidenceIndicator confidence={95} />);

      expect(screen.queryByText(/high/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility (WCAG 2.1 AA)', () => {
    it('has role="status" for screen readers', () => {
      render(<ConfidenceIndicator confidence={95} />);

      const badge = screen.getByRole('status');
      expect(badge).toBeInTheDocument();
    });

    it('has aria-label with confidence percentage and level for high confidence', () => {
      render(<ConfidenceIndicator confidence={95} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Confidence: 95% - High');
    });

    it('has aria-label with confidence percentage and level for medium confidence', () => {
      render(<ConfidenceIndicator confidence={80} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Confidence: 80% - Medium');
    });

    it('has aria-label with confidence percentage and level for low confidence', () => {
      render(<ConfidenceIndicator confidence={50} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveAttribute('aria-label', 'Confidence: 50% - Low');
    });

    it('marks icon as decorative with aria-hidden', () => {
      render(<ConfidenceIndicator confidence={95} />);

      const badge = screen.getByRole('status');
      const svg = badge.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Size variants', () => {
    it('renders small size when size="sm"', () => {
      render(<ConfidenceIndicator confidence={95} size="sm" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('text-xs');
    });

    it('renders medium size when size="md"', () => {
      render(<ConfidenceIndicator confidence={95} size="md" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('text-sm');
    });

    it('renders large size when size="lg"', () => {
      render(<ConfidenceIndicator confidence={95} size="lg" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('text-base');
    });

    it('defaults to medium size when size not specified', () => {
      render(<ConfidenceIndicator confidence={95} />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('text-sm');
    });
  });

  describe('Custom className', () => {
    it('applies custom className when provided', () => {
      render(<ConfidenceIndicator confidence={95} className="custom-class" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('custom-class');
    });

    it('preserves base classes when custom className added', () => {
      render(<ConfidenceIndicator confidence={95} className="custom-class" />);

      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('custom-class');
      expect(badge).toHaveClass('bg-green-100'); // Base class still present
    });
  });

  describe('Edge cases', () => {
    it('handles 0% confidence', () => {
      render(<ConfidenceIndicator confidence={0} />);

      expect(screen.getByText('0%')).toBeInTheDocument();
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-red-100'); // Low confidence
    });

    it('handles 100% confidence', () => {
      render(<ConfidenceIndicator confidence={100} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-green-100'); // High confidence
    });

    it('handles fractional confidence values', () => {
      render(<ConfidenceIndicator confidence={69.9} />);

      expect(screen.getByText('70%')).toBeInTheDocument();
      const badge = screen.getByRole('status');
      expect(badge).toHaveClass('bg-yellow-100'); // Rounds to 70
    });
  });
});
