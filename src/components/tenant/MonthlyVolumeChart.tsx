'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

interface MonthlyVolumeChartProps {
  data: { name: string; invoices: number }[]
}

export function MonthlyVolumeChart({ data }: MonthlyVolumeChartProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-slate-800">Monthly Invoice Volume</h2>
      <p className="mt-1 text-sm text-slate-500">Total invoices created over the last 12 months.</p>
      <div className="mt-6 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
              }}
            />
            <Bar dataKey="invoices" fill="#2863FF" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}