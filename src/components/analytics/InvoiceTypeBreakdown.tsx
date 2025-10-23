'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface TypeData {
  name: string;
  value: number;
  color: string;
}

interface InvoiceTypeBreakdownProps {
  data?: TypeData[];
}

// Demo data for when no data is provided
const demoData: TypeData[] = [
  { name: 'Purchase Invoices', value: 85, color: '#ef4444' },
  { name: 'Sale Invoices', value: 62, color: '#10b981' },
  { name: 'Credit Notes', value: 8, color: '#f59e0b' },
  { name: 'Proforma', value: 15, color: '#3b82f6' },
];

export function InvoiceTypeBreakdown({ data = demoData }: InvoiceTypeBreakdownProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Invoice Type Distribution</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Breakdown by invoice type ({total} total invoices)
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
