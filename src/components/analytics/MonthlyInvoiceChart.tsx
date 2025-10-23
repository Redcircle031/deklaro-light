'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonthlyData {
  month: string;
  incoming: number;
  outgoing: number;
  total: number;
}

interface MonthlyInvoiceChartProps {
  data?: MonthlyData[];
}

// Demo data for when no data is provided
const demoData: MonthlyData[] = [
  { month: 'Jan', incoming: 12, outgoing: 8, total: 20 },
  { month: 'Feb', incoming: 15, outgoing: 10, total: 25 },
  { month: 'Mar', incoming: 18, outgoing: 12, total: 30 },
  { month: 'Apr', incoming: 14, outgoing: 9, total: 23 },
  { month: 'May', incoming: 20, outgoing: 15, total: 35 },
  { month: 'Jun', incoming: 22, outgoing: 16, total: 38 },
];

export function MonthlyInvoiceChart({ data = demoData }: MonthlyInvoiceChartProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Monthly Invoice Volume</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Invoice counts by type over the last 6 months
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="month"
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />
          <Bar dataKey="incoming" fill="#ef4444" name="Purchase Invoices" />
          <Bar dataKey="outgoing" fill="#10b981" name="Sale Invoices" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
