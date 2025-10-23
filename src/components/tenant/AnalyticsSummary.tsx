'use client'

import Link from 'next/link'

interface StatCardProps {
  title: string
  value: string
  description?: string
  href?: string
}

function StatCard({ title, value, description, href }: StatCardProps) {
  const content = (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 ${
        href ? 'transition-all duration-200 hover:border-brand-300 hover:shadow-lg' : ''
      }`}
    >
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
    </div>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

interface AnalyticsSummaryProps {
  totalInvoices: number
  totalAmount: number
  averageAmount: number
  totalPending: number
  searchParams: { [key: string]: string | string[] | undefined }
}

export function AnalyticsSummary({ totalInvoices, totalAmount, averageAmount, totalPending, searchParams }: AnalyticsSummaryProps) {
  const createURL = (params: Record<string, string>) => {
    const urlParams = new URLSearchParams(searchParams as any)
    Object.entries(params).forEach(([key, value]) => {
      urlParams.set(key, value)
    })
    return `/dashboard/invoices?${urlParams.toString()}`
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Invoices"
        value={totalInvoices.toLocaleString()}
        description="Total number of invoices in the selected period."
        href={createURL({})}
      />
      <StatCard
        title="Total Pending"
        value={totalPending.toLocaleString()}
        description="Invoices awaiting review or approval."
        href={createURL({ filter: 'pending' })}
      />
      <StatCard
        title="Total Amount"
        value={`PLN ${totalAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        description="Sum of gross amounts for all invoices."
      />
      <StatCard
        title="Average Amount"
        value={`PLN ${averageAmount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        description="Average gross amount per invoice."
      />
    </div>
  )
}