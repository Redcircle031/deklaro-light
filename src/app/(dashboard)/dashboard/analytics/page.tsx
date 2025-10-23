import { MonthlyInvoiceChart } from '@/components/analytics/MonthlyInvoiceChart';
import { InvoiceTypeBreakdown } from '@/components/analytics/InvoiceTypeBreakdown';
import { VATSummary } from '@/components/analytics/VATSummary';
import { TrendsAnalysis } from '@/components/analytics/TrendsAnalysis';
import { BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'Analytics & Reports | Deklaro',
  description: 'Financial analytics and reporting dashboard',
};

export default function AnalyticsPage() {
  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Analytics & Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Visual insights into your invoice data and financial trends
          </p>
        </div>
        <button className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          Export Report
        </button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trends Analysis - Full Width */}
        <div className="lg:col-span-2">
          <TrendsAnalysis />
        </div>

        {/* Monthly Invoice Chart */}
        <MonthlyInvoiceChart />

        {/* Invoice Type Breakdown */}
        <InvoiceTypeBreakdown />

        {/* VAT Summary - Full Width */}
        <div className="lg:col-span-2">
          <VATSummary />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Invoice Value</h3>
          <p className="text-3xl font-bold mt-2">2,456 PLN</p>
          <p className="text-xs text-green-600 mt-1">+12.5% vs last month</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Processing Time</h3>
          <p className="text-3xl font-bold mt-2">1.2 days</p>
          <p className="text-xs text-green-600 mt-1">-15% faster than average</p>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">OCR Accuracy</h3>
          <p className="text-3xl font-bold mt-2">96.8%</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Across all invoices</p>
        </div>
      </div>
    </div>
  );
}
