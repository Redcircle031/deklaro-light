'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TrendData {
  month: string;
  revenue: number;
  expenses: number;
}

interface TrendsAnalysisProps {
  data?: TrendData[];
}

// Demo data for when no data is provided
const demoData: TrendData[] = [
  { month: 'Jan', revenue: 45000, expenses: 32000 },
  { month: 'Feb', revenue: 52000, expenses: 35000 },
  { month: 'Mar', revenue: 48000, expenses: 38000 },
  { month: 'Apr', revenue: 61000, expenses: 42000 },
  { month: 'May', revenue: 55000, expenses: 39000 },
  { month: 'Jun', revenue: 67000, expenses: 45000 },
];

export function TrendsAnalysis({ data = demoData }: TrendsAnalysisProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculate trend percentages
  const currentMonth = data[data.length - 1];
  const previousMonth = data[data.length - 2];

  const revenueTrend = previousMonth
    ? ((currentMonth.revenue - previousMonth.revenue) / previousMonth.revenue) * 100
    : 0;

  const expensesTrend = previousMonth
    ? ((currentMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100
    : 0;

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold">Financial Trends</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Revenue and expenses over the last 6 months
        </p>
      </div>

      {/* Trend indicators */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-900 dark:text-green-100">Revenue Trend</span>
            {revenueTrend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div className={`text-2xl font-bold mt-1 ${revenueTrend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {revenueTrend >= 0 ? '+' : ''}{revenueTrend.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">vs. last month</div>
        </div>

        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">Expenses Trend</span>
            {expensesTrend >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-600" />
            )}
          </div>
          <div className={`text-2xl font-bold mt-1 ${expensesTrend >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {expensesTrend >= 0 ? '+' : ''}{expensesTrend.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">vs. last month</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="month"
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
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2}
            name="Revenue (Sales)"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="expenses"
            stroke="#ef4444"
            strokeWidth={2}
            name="Expenses (Purchases)"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
