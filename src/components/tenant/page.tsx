import { getMonthlyInvoiceVolume, getInvoiceTypeDistribution, getInvoiceSummaryMetrics } from '@/app/tenants/actions'
import { MonthlyVolumeChart } from '@/components/charts/MonthlyVolumeChart'
import { InvoiceTypePieChart } from '@/components/charts/InvoiceTypePieChart'
import { AnalyticsFilters } from '@/components/charts/AnalyticsFilters'
import { AnalyticsSummary } from '@/components/charts/AnalyticsSummary'

export default async function ReportsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const from = typeof searchParams.from === 'string' ? new Date(searchParams.from) : undefined
  const to = typeof searchParams.to === 'string' ? new Date(searchParams.to) : undefined

  if (to) {
    to.setHours(23, 59, 59, 999) // Include the whole end day
  }

  const dateRange = { from, to }

  const volumeData = await getMonthlyInvoiceVolume(dateRange)
  const typeData = await getInvoiceTypeDistribution(dateRange)
  const summaryData = await getInvoiceSummaryMetrics(dateRange)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="mt-1 text-slate-600">
          Visualize your invoice data to gain insights into your business operations.
        </p>
      </div>

      <AnalyticsFilters />

      <AnalyticsSummary {...summaryData} searchParams={searchParams} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <MonthlyVolumeChart data={volumeData} />
        <InvoiceTypePieChart data={typeData} />
      </div>
    </div>
  )
}