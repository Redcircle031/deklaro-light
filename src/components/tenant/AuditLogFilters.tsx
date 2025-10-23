'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { DatePicker } from '@/components/ui/DatePicker'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { useState, ChangeEvent } from 'react'
import { format } from 'date-fns'
import { exportAuditLogsAsCsv } from '@/components/tenant/actions'
import { Download } from 'lucide-react'

export function AuditLogFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleFilterChange = useDebouncedCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1') // Reset to page 1 when filtering
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, 300) // 300ms debounce delay

  const handleDateChange = (key: 'startDate' | 'endDate', date: Date | undefined) => {
    handleFilterChange(key, date ? format(date, 'yyyy-MM-dd') : '')
  }

  const { toast } = useToast()
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const filters = {
        action: searchParams.get('action') || undefined,
        userId: searchParams.get('userId') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
      }

      const result = await exportAuditLogsAsCsv(filters)

      if (result.success && result.csvContent) {
        const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      } else {
        toast({
          variant: 'destructive',
          title: 'Export Failed',
          description: result.message || 'Could not export audit logs.',
        })
      }
    } finally {
      setIsExporting(false)
    }
  }

  const handleClearFilters = () => {
    router.push(pathname)
  }

  const hasFilters =
    searchParams.has('action') ||
    searchParams.has('startDate') ||
    searchParams.has('endDate') ||
    searchParams.has('sortBy')

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      <Input
        placeholder="Filter by action (e.g., user.invite)..."
        defaultValue={searchParams.get('action') || ''}
        onChange={(e) => handleFilterChange('action', e.target.value)}
        className="max-w-sm"
      />
      <DatePicker
        date={searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined}
        setDate={(date) => handleDateChange('startDate', date)}
        placeholder="Start date"
      />
      <DatePicker
        date={searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined}
        setDate={(date) => handleDateChange('endDate', date)}
        placeholder="End date"
      />
      {hasFilters && (
        <Button variant="ghost" onClick={handleClearFilters}>
          Clear Filters
        </Button>
      )}
      <Button onClick={handleExport} disabled={isExporting}>
        <Download className="mr-2 h-4 w-4" />
        {isExporting ? 'Exporting...' : 'Export to CSV'}
      </Button>
    </div>
  )
}