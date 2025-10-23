'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface VATData {
  rate: string;
  netAmount: number;
  vatAmount: number;
  grossAmount: number;
}

interface VATSummaryProps {
  data?: VATData[];
}

// Demo data for when no data is provided
const demoData: VATData[] = [
  { rate: '23%', netAmount: 45000, vatAmount: 10350, grossAmount: 55350 },
  { rate: '8%', netAmount: 12000, vatAmount: 960, grossAmount: 12960 },
  { rate: '5%', netAmount: 8000, vatAmount: 400, grossAmount: 8400 },
  { rate: '0%', netAmount: 3000, vatAmount: 0, grossAmount: 3000 },
];

export function VATSummary({ data = demoData }: VATSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const totalVAT = data.reduce((sum, item) => sum + item.vatAmount, 0);

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">VAT Summary by Rate</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Total VAT collected: {formatCurrency(totalVAT)}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="rate"
            className="text-xs"
            tick={{ fill: 'currentColor' }}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'currentColor' }}
            tickFormatter={formatCurrency}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number) => formatCurrency(value)}
          />
          <Legend />
          <Bar dataKey="netAmount" fill="#3b82f6" name="Net Amount" />
          <Bar dataKey="vatAmount" fill="#8b5cf6" name="VAT Amount" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
